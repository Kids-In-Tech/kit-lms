import os
import uuid
import random
import httpx
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from jose import jwt, JWTError
from passlib.context import CryptContext
from typing import Optional

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def gid(p=""): return f"{p}{uuid.uuid4().hex[:12]}"
def hpw(pw): return pwd_ctx.hash(pw)
def vpw(pw, h): return pwd_ctx.verify(pw, h)
def mkjwt(d):
    return jwt.encode({**d, "exp": datetime.now(timezone.utc) + timedelta(hours=24)}, JWT_SECRET, algorithm="HS256")

def get_user(request: Request):
    st = request.cookies.get("session_token")
    if st:
        sess = db.user_sessions.find_one({"session_token": st}, {"_id": 0})
        if sess:
            exp = sess.get("expires_at")
            if isinstance(exp, str): exp = datetime.fromisoformat(exp)
            if exp and exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
            if exp and exp > datetime.now(timezone.utc):
                u = db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
                if u: return u
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        sess = db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if sess:
            exp = sess.get("expires_at")
            if isinstance(exp, str): exp = datetime.fromisoformat(exp)
            if exp and exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
            if exp and exp > datetime.now(timezone.utc):
                u = db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
                if u: return u
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            u = db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
            if u: return u
        except JWTError: pass
    raise HTTPException(401, "Not authenticated")

def require_role(user, roles):
    if user.get("role") not in roles:
        raise HTTPException(403, "Insufficient permissions")

def send_notification(title, message, ntype="system", target_role="all", target_users=None, created_by="system"):
    notif = {
        "notification_id": gid("notif_"), "title": title, "message": message,
        "type": ntype, "target_role": target_role, "target_users": target_users or [],
        "created_by": created_by, "read_by": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.notifications.insert_one(notif)
    return {k: v for k, v in notif.items() if k != "_id"}

def recalc_enrollment_progress(course_id):
    """Recalculate progress for ALL enrollments of a course based on current lesson count."""
    total_lessons = db.lessons.count_documents({"course_id": course_id})
    if total_lessons == 0:
        return
    enrollments = list(db.enrollments.find({"course_id": course_id}, {"_id": 0}))
    for e in enrollments:
        completed = e.get("completed_lessons", [])
        # Filter out lessons that no longer exist
        existing = [lid for lid in completed if db.lessons.find_one({"lesson_id": lid})]
        progress = round(len(existing) / total_lessons * 100, 1)
        update_data = {"completed_lessons": existing, "progress": progress}
        if progress < 100 and e.get("status") == "completed":
            update_data["status"] = "active"
        elif progress >= 100 and e.get("status") != "completed":
            update_data["status"] = "completed"
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        db.enrollments.update_one({"enrollment_id": e["enrollment_id"]}, {"$set": update_data})

# ============ AUTH ============
@app.post("/api/auth/register")
async def register(request: Request):
    body = await request.json()
    if db.users.find_one({"email": body["email"]}, {"_id": 0}):
        raise HTTPException(400, "Email already exists")
    user = {
        "user_id": gid("user_"), "email": body["email"], "name": body["name"],
        "password_hash": hpw(body["password"]), "role": body.get("role", "student"),
        "picture": "", "bio": "", "status": "active", "points": 0,
        "must_reset_password": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.users.insert_one(user)
    token = mkjwt({"user_id": user["user_id"], "role": user["role"]})
    return {"token": token, "user": {k: v for k, v in user.items() if k not in ["password_hash", "_id"]}}

@app.post("/api/auth/login")
async def login(request: Request):
    body = await request.json()
    u = db.users.find_one({"email": body["email"]}, {"_id": 0})
    if not u or not vpw(body["password"], u.get("password_hash", "")):
        raise HTTPException(401, "Invalid email or password")
    token = mkjwt({"user_id": u["user_id"], "role": u["role"]})
    user_data = {k: v for k, v in u.items() if k != "password_hash"}
    return {"token": token, "user": user_data}

@app.post("/api/auth/session")
async def auth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(400, "session_id required")
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    if resp.status_code != 200:
        raise HTTPException(401, "Invalid session")
    data = resp.json()
    existing = db.users.find_one({"email": data["email"]}, {"_id": 0})
    if existing:
        db.users.update_one({"email": data["email"]}, {"$set": {"name": data["name"], "picture": data.get("picture", "")}})
        user_id = existing["user_id"]
    else:
        user_id = gid("user_")
        db.users.insert_one({
            "user_id": user_id, "email": data["email"], "name": data["name"],
            "picture": data.get("picture", ""), "role": "student", "bio": "",
            "status": "active", "points": 0, "must_reset_password": False, "password_hash": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    session_token = data.get("session_token", gid("sess_"))
    db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    response.set_cookie("session_token", session_token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*3600)
    user = db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {k: v for k, v in user.items() if k != "password_hash"}

@app.get("/api/auth/me")
async def auth_me(request: Request):
    u = get_user(request)
    return {k: v for k, v in u.items() if k != "password_hash"}

@app.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    st = request.cookies.get("session_token")
    if st:
        db.user_sessions.delete_one({"session_token": st})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

@app.post("/api/auth/forgot-password")
async def forgot_password(request: Request):
    body = await request.json()
    email = body.get("email", "")
    u = db.users.find_one({"email": email}, {"_id": 0})
    if not u:
        raise HTTPException(404, "No account found with this email")
    reset_token = gid("reset_")
    db.password_resets.insert_one({
        "token": reset_token, "user_id": u["user_id"], "email": email,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "used": False, "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Password reset link has been sent to your email", "reset_token": reset_token}

@app.post("/api/auth/reset-password")
async def reset_password(request: Request):
    body = await request.json()
    token = body.get("token", "")
    new_password = body.get("password", "")
    user_id = body.get("user_id", "")
    if not new_password or len(new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if token:
        reset = db.password_resets.find_one({"token": token, "used": False}, {"_id": 0})
        if not reset:
            raise HTTPException(400, "Invalid or expired reset token")
        exp = reset.get("expires_at")
        if isinstance(exp, str): exp = datetime.fromisoformat(exp)
        if exp and exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
        if exp and exp < datetime.now(timezone.utc):
            raise HTTPException(400, "Reset token has expired")
        user_id = reset["user_id"]
        db.password_resets.update_one({"token": token}, {"$set": {"used": True}})
    if not user_id:
        raise HTTPException(400, "Invalid request")
    db.users.update_one({"user_id": user_id}, {"$set": {"password_hash": hpw(new_password), "must_reset_password": False}})
    return {"message": "Password updated successfully"}

@app.post("/api/auth/change-password")
async def change_password(request: Request):
    user = get_user(request)
    body = await request.json()
    current = body.get("current_password", "")
    new_pw = body.get("new_password", "")
    if not new_pw or len(new_pw) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")
    u = db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if u.get("password_hash") and not vpw(current, u["password_hash"]):
        raise HTTPException(400, "Current password is incorrect")
    db.users.update_one({"user_id": user["user_id"]}, {"$set": {"password_hash": hpw(new_pw), "must_reset_password": False}})
    return {"message": "Password changed successfully"}

@app.put("/api/auth/profile")
async def update_profile(request: Request):
    user = get_user(request)
    body = await request.json()
    allowed = ["name", "first_name", "middle_name", "last_name", "bio", "picture", "phone", "dob", "gender", "school_name", "class_name", "guardian_name", "language"]
    update = {k: v for k, v in body.items() if k in allowed}
    if "first_name" in update or "last_name" in update:
        fn = update.get("first_name", user.get("first_name", ""))
        mn = update.get("middle_name", user.get("middle_name", ""))
        ln = update.get("last_name", user.get("last_name", ""))
        update["name"] = f"{fn} {mn} {ln}".replace("  ", " ").strip()
    db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    return db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})

# ============ USERS ============
@app.get("/api/users")
async def list_users(request: Request, role: Optional[str] = None, search: Optional[str] = None):
    user = get_user(request)
    require_role(user, ["super_admin"])
    query = {}
    if role: query["role"] = role
    if search: query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"email": {"$regex": search, "$options": "i"}}]
    return list(db.users.find(query, {"_id": 0, "password_hash": 0}))

@app.get("/api/users/{user_id}")
async def get_single_user(user_id: str, request: Request):
    get_user(request)
    u = db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not u: raise HTTPException(404, "User not found")
    # Enrich with enrolled courses
    enrollments = list(db.enrollments.find({"student_id": user_id}, {"_id": 0}))
    enrolled_courses = []
    for e in enrollments:
        course = db.courses.find_one({"course_id": e["course_id"]}, {"_id": 0})
        if course:
            enrolled_courses.append({
                "enrollment_id": e["enrollment_id"],
                "course_id": e["course_id"],
                "course_title": course["title"],
                "progress": e.get("progress", 0),
                "status": e.get("status", "active"),
                "enrolled_at": e.get("enrolled_at", "")
            })
    u["enrolled_courses"] = enrolled_courses
    return u

@app.post("/api/users")
async def create_user(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin"])
    body = await request.json()
    if db.users.find_one({"email": body["email"]}, {"_id": 0}):
        raise HTTPException(400, "Email already exists")
    default_pw = body.get("password", "123456")
    new_user = {
        "user_id": gid("user_"), "email": body["email"],
        "first_name": body.get("first_name", body.get("name", "").split()[0] if body.get("name") else ""),
        "middle_name": body.get("middle_name", ""),
        "last_name": body.get("last_name", body.get("name", "").split()[-1] if body.get("name") and len(body.get("name", "").split()) > 1 else ""),
        "name": body.get("name", f"{body.get('first_name', '')} {body.get('middle_name', '')} {body.get('last_name', '')}".replace("  ", " ").strip()),
        "password_hash": hpw(default_pw), "role": body.get("role", "student"),
        "picture": body.get("picture", ""), "bio": body.get("bio", ""),
        "dob": body.get("dob", ""), "gender": body.get("gender", ""),
        "phone": body.get("phone", ""), "school_name": body.get("school_name", ""),
        "class_name": body.get("class_name", ""), "guardian_name": body.get("guardian_name", ""),
        "status": "active", "points": 0,
        "must_reset_password": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.users.insert_one(new_user)
    result = {k: v for k, v in new_user.items() if k not in ["password_hash", "_id"]}
    result["default_password"] = default_pw
    return result

@app.put("/api/users/{user_id}")
async def update_user(user_id: str, request: Request):
    user = get_user(request)
    body = await request.json()
    if user["role"] != "super_admin" and user["user_id"] != user_id:
        raise HTTPException(403, "Cannot edit other users")
    update = {k: v for k, v in body.items() if k not in ["user_id", "password_hash", "_id"]}
    if "password" in body and body["password"]:
        update["password_hash"] = hpw(body["password"])
        del update["password"]
    db.users.update_one({"user_id": user_id}, {"$set": update})
    return db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin"])
    db.users.delete_one({"user_id": user_id})
    return {"message": "User deleted"}

@app.put("/api/users/{user_id}/suspend")
async def suspend_user(user_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin"])
    db.users.update_one({"user_id": user_id}, {"$set": {"status": "suspended"}})
    return {"message": "User suspended"}

@app.put("/api/users/{user_id}/reactivate")
async def reactivate_user(user_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin"])
    db.users.update_one({"user_id": user_id}, {"$set": {"status": "active"}})
    return {"message": "User reactivated"}

# ============ ANNOUNCEMENTS ============
@app.get("/api/announcements")
async def list_announcements(request: Request):
    user = get_user(request)
    query = {"$or": [{"target": "all"}, {"target": user["role"]}]}
    if user["role"] != "super_admin":
        query["$or"].append({"target_courses": {"$in": []}})
        if user["role"] == "student":
            enrs = list(db.enrollments.find({"student_id": user["user_id"]}, {"course_id": 1, "_id": 0}))
            cids = [e["course_id"] for e in enrs]
            query["$or"].append({"target_courses": {"$in": cids}})
        elif user["role"] == "instructor":
            courses = list(db.courses.find({"instructor_ids": user["user_id"]}, {"course_id": 1, "_id": 0}))
            cids = [c["course_id"] for c in courses]
            query["$or"].append({"target_courses": {"$in": cids}})
    return list(db.announcements.find(query, {"_id": 0}).sort("created_at", -1).limit(50))

@app.post("/api/announcements")
async def create_announcement(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    body = await request.json()
    ann = {
        "announcement_id": gid("ann_"), "title": body["title"],
        "message": body.get("message", ""), "target": body.get("target", "all"),
        "target_courses": body.get("target_courses", []),
        "priority": body.get("priority", "normal"),
        "created_by": user["user_id"], "author_name": user.get("name", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.announcements.insert_one(ann)
    return {k: v for k, v in ann.items() if k != "_id"}

@app.delete("/api/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin"])
    db.announcements.delete_one({"announcement_id": announcement_id})
    return {"message": "Announcement deleted"}

# ============ CERTIFICATE CHECK ============
@app.get("/api/certificates/check/{course_id}")
async def check_certificate(course_id: str, request: Request):
    user = get_user(request)
    enrollment = db.enrollments.find_one({"student_id": user["user_id"], "course_id": course_id}, {"_id": 0})
    if not enrollment:
        return {"eligible": False, "reason": "Not enrolled"}
    total_lessons = db.lessons.count_documents({"course_id": course_id})
    completed = len(enrollment.get("completed_lessons", []))
    all_lessons_done = completed >= total_lessons and total_lessons > 0
    quizzes = list(db.quizzes.find({"course_id": course_id}, {"_id": 0}))
    quiz_scores = []
    for q in quizzes:
        att = db.quiz_attempts.find_one({"quiz_id": q["quiz_id"], "student_id": user["user_id"]}, {"_id": 0}, sort=[("score", -1)])
        if att:
            quiz_scores.append(att["score"])
    avg_quiz = round(sum(quiz_scores) / len(quiz_scores), 1) if quiz_scores else 100
    eligible = all_lessons_done and avg_quiz >= 60
    existing = db.certificates.find_one({"student_id": user["user_id"], "course_id": course_id}, {"_id": 0})
    if eligible and not existing:
        cert = {"certificate_id": gid("cert_"), "student_id": user["user_id"], "course_id": course_id, "template_id": "", "issued_by": "system", "issued_at": datetime.now(timezone.utc).isoformat()}
        db.certificates.insert_one(cert)
    return {
        "eligible": eligible, "issued": existing is not None or eligible,
        "lessons_completed": completed, "total_lessons": total_lessons,
        "avg_quiz_score": avg_quiz, "all_lessons_done": all_lessons_done,
        "certificate": existing or (db.certificates.find_one({"student_id": user["user_id"], "course_id": course_id}, {"_id": 0}) if eligible else None)
    }

# ============ COURSES ============
@app.get("/api/courses")
async def list_courses(request: Request, status: Optional[str] = None, category: Optional[str] = None, search: Optional[str] = None, instructor_id: Optional[str] = None):
    query = {}
    if status: query["status"] = status
    if category: query["category"] = category
    if instructor_id: query["instructor_ids"] = instructor_id
    if search: query["$or"] = [{"title": {"$regex": search, "$options": "i"}}, {"description": {"$regex": search, "$options": "i"}}]
    try:
        user = get_user(request)
        if user["role"] == "instructor": query["instructor_ids"] = user["user_id"]
        elif user["role"] == "student": query["status"] = "published"
    except:
        query["status"] = "published"
        query["visibility"] = "public"
    courses = list(db.courses.find(query, {"_id": 0}))
    for c in courses:
        c["lesson_count"] = db.lessons.count_documents({"course_id": c["course_id"]})
        c["module_count"] = db.modules.count_documents({"course_id": c["course_id"]})
        c["enrollment_count"] = db.enrollments.count_documents({"course_id": c["course_id"]})
    return courses

@app.get("/api/courses/{course_id}")
async def get_course(course_id: str, request: Request):
    c = db.courses.find_one({"course_id": course_id}, {"_id": 0})
    if not c: raise HTTPException(404, "Course not found")
    c["modules"] = list(db.modules.find({"course_id": course_id}, {"_id": 0}).sort("order", 1))
    for m in c["modules"]:
        m["lessons"] = list(db.lessons.find({"module_id": m["module_id"]}, {"_id": 0}).sort("order", 1))
    c["enrollment_count"] = db.enrollments.count_documents({"course_id": course_id})
    return c

@app.post("/api/courses")
async def create_course(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    body = await request.json()
    course = {
        "course_id": gid("course_"), "title": body["title"],
        "slug": body.get("slug", body["title"].lower().replace(" ", "-")),
        "description": body.get("description", ""), "thumbnail": body.get("thumbnail", ""),
        "category": body.get("category", "General"), "level": body.get("level", "beginner"),
        "duration_weeks": body.get("duration_weeks", 4),
        "instructor_ids": body.get("instructor_ids", [user["user_id"]] if user["role"] == "instructor" else []),
        "status": body.get("status", "draft"), "visibility": body.get("visibility", "public"),
        "prerequisites": body.get("prerequisites", ""), "certificate_enabled": body.get("certificate_enabled", False),
        "created_by": user["user_id"], "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    db.courses.insert_one(course)
    # Auto-generate certificate template if certificate_enabled
    if course.get("certificate_enabled"):
        template = {
            "template_id": gid("tmpl_"),
            "name": f"{course['title']} Certificate",
            "description": f"Certificate of completion for {course['title']}",
            "course_id": course["course_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        db.cert_templates.insert_one(template)
    return {k: v for k, v in course.items() if k != "_id"}

@app.put("/api/courses/{course_id}")
async def update_course(course_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    body = await request.json()
    update = {k: v for k, v in body.items() if k not in ["course_id", "_id"]}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    db.courses.update_one({"course_id": course_id}, {"$set": update})
    return db.courses.find_one({"course_id": course_id}, {"_id": 0})

@app.delete("/api/courses/{course_id}")
async def delete_course(course_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin"])
    db.courses.delete_one({"course_id": course_id})
    db.modules.delete_many({"course_id": course_id})
    db.lessons.delete_many({"course_id": course_id})
    return {"message": "Course deleted"}

# ============ MODULES ============
@app.get("/api/courses/{course_id}/modules")
async def list_modules(course_id: str):
    modules = list(db.modules.find({"course_id": course_id}, {"_id": 0}).sort("order", 1))
    for m in modules:
        m["lessons"] = list(db.lessons.find({"module_id": m["module_id"]}, {"_id": 0}).sort("order", 1))
    return modules

@app.post("/api/courses/{course_id}/modules")
async def create_module(course_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    body = await request.json()
    count = db.modules.count_documents({"course_id": course_id})
    module = {
        "module_id": gid("mod_"), "course_id": course_id, "title": body["title"],
        "description": body.get("description", ""), "order": body.get("order", count + 1),
        "estimated_duration": body.get("estimated_duration", "1 hour"),
        "unlock_rule": body.get("unlock_rule", "sequential"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.modules.insert_one(module)
    return {k: v for k, v in module.items() if k != "_id"}

@app.put("/api/modules/{module_id}")
async def update_module(module_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    body = await request.json()
    update = {k: v for k, v in body.items() if k not in ["module_id", "_id"]}
    db.modules.update_one({"module_id": module_id}, {"$set": update})
    return db.modules.find_one({"module_id": module_id}, {"_id": 0})

@app.delete("/api/modules/{module_id}")
async def delete_module(module_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    db.modules.delete_one({"module_id": module_id})
    db.lessons.delete_many({"module_id": module_id})
    return {"message": "Module deleted"}

@app.put("/api/courses/{course_id}/modules/reorder")
async def reorder_modules(course_id: str, request: Request):
    get_user(request)
    body = await request.json()
    for item in body.get("order", []):
        db.modules.update_one({"module_id": item["module_id"]}, {"$set": {"order": item["order"]}})
    return {"message": "Reordered"}

# ============ LESSONS ============
@app.get("/api/modules/{module_id}/lessons")
async def list_lessons(module_id: str):
    return list(db.lessons.find({"module_id": module_id}, {"_id": 0}).sort("order", 1))

@app.post("/api/modules/{module_id}/lessons")
async def create_lesson(module_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    body = await request.json()
    mod = db.modules.find_one({"module_id": module_id}, {"_id": 0})
    if not mod: raise HTTPException(404, "Module not found")
    count = db.lessons.count_documents({"module_id": module_id})
    lesson = {
        "lesson_id": gid("les_"), "module_id": module_id, "course_id": mod["course_id"],
        "title": body["title"], "type": body.get("type", "text"),
        "duration": body.get("duration", "10 min"), "content": body.get("content", ""),
        "video_url": body.get("video_url", ""), "youtube_url": body.get("youtube_url", ""),
        "order": body.get("order", count + 1), "status": body.get("status", "draft"),
        "quiz_id": body.get("quiz_id", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.lessons.insert_one(lesson)
    return {k: v for k, v in lesson.items() if k != "_id"}

@app.put("/api/lessons/{lesson_id}")
async def update_lesson(lesson_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    body = await request.json()
    update = {k: v for k, v in body.items() if k not in ["lesson_id", "_id"]}
    db.lessons.update_one({"lesson_id": lesson_id}, {"$set": update})
    return db.lessons.find_one({"lesson_id": lesson_id}, {"_id": 0})

@app.delete("/api/lessons/{lesson_id}")
async def delete_lesson(lesson_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    db.lessons.delete_one({"lesson_id": lesson_id})
    return {"message": "Lesson deleted"}

@app.post("/api/lessons/{lesson_id}/complete")
async def complete_lesson(lesson_id: str, request: Request):
    user = get_user(request)
    lesson = db.lessons.find_one({"lesson_id": lesson_id}, {"_id": 0})
    if not lesson: raise HTTPException(404, "Lesson not found")
    enrollment = db.enrollments.find_one({"student_id": user["user_id"], "course_id": lesson["course_id"]}, {"_id": 0})
    if not enrollment: raise HTTPException(400, "Not enrolled")
    completed = enrollment.get("completed_lessons", [])
    progress = enrollment.get("progress", 0)
    if lesson_id not in completed:
        completed.append(lesson_id)
        total = db.lessons.count_documents({"course_id": lesson["course_id"]})
        progress = round(len(completed) / total * 100, 1) if total > 0 else 0
        update_data = {"completed_lessons": completed, "progress": progress}
        if progress >= 100:
            update_data["status"] = "completed"
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        db.enrollments.update_one({"enrollment_id": enrollment["enrollment_id"]}, {"$set": update_data})
    db.activity_logs.insert_one({
        "log_id": gid("log_"), "user_id": user["user_id"], "action": "lesson_completed",
        "details": {"lesson_id": lesson_id, "course_id": lesson["course_id"]},
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Lesson completed", "progress": progress}

# ============ QUIZZES ============
@app.get("/api/quizzes")
async def list_quizzes(request: Request, course_id: Optional[str] = None):
    user = get_user(request)
    query = {}
    if course_id: query["course_id"] = course_id
    if user["role"] == "instructor":
        query["course_id"] = {"$in": [c["course_id"] for c in db.courses.find({"instructor_ids": user["user_id"]}, {"course_id": 1, "_id": 0})]}
    quizzes = list(db.quizzes.find(query, {"_id": 0}))
    for q in quizzes:
        q["attempt_count"] = db.quiz_attempts.count_documents({"quiz_id": q["quiz_id"]})
    return quizzes

@app.get("/api/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str, request: Request):
    q = db.quizzes.find_one({"quiz_id": quiz_id}, {"_id": 0})
    if not q: raise HTTPException(404, "Quiz not found")
    return q

@app.post("/api/quizzes")
async def create_quiz(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    body = await request.json()
    quiz = {
        "quiz_id": gid("quiz_"), "title": body["title"],
        "course_id": body.get("course_id", ""), "module_id": body.get("module_id", ""),
        "lesson_id": body.get("lesson_id", ""), "questions": body.get("questions", []),
        "time_limit": body.get("time_limit", 30), "attempts_allowed": body.get("attempts_allowed", 3),
        "pass_mark": body.get("pass_mark", 70), "auto_grade": body.get("auto_grade", True),
        "created_by": user["user_id"], "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.quizzes.insert_one(quiz)
    return {k: v for k, v in quiz.items() if k != "_id"}

@app.put("/api/quizzes/{quiz_id}")
async def update_quiz(quiz_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    body = await request.json()
    db.quizzes.update_one({"quiz_id": quiz_id}, {"$set": {k: v for k, v in body.items() if k not in ["quiz_id", "_id"]}})
    return db.quizzes.find_one({"quiz_id": quiz_id}, {"_id": 0})

@app.delete("/api/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    db.quizzes.delete_one({"quiz_id": quiz_id})
    return {"message": "Quiz deleted"}

@app.post("/api/quizzes/{quiz_id}/attempt")
async def submit_quiz(quiz_id: str, request: Request):
    user = get_user(request)
    body = await request.json()
    quiz = db.quizzes.find_one({"quiz_id": quiz_id}, {"_id": 0})
    if not quiz: raise HTTPException(404, "Quiz not found")
    existing = db.quiz_attempts.count_documents({"quiz_id": quiz_id, "student_id": user["user_id"]})
    if existing >= quiz.get("attempts_allowed", 3):
        raise HTTPException(400, "Max attempts reached")
    score = 0
    answers = body.get("answers", [])
    if quiz.get("auto_grade", True):
        for q in quiz.get("questions", []):
            for a in answers:
                if a.get("question_id") == q.get("question_id") and a.get("answer") == q.get("correct_answer"):
                    score += 1
        total = len(quiz.get("questions", []))
        pct = round(score / total * 100, 1) if total > 0 else 0
    else:
        pct = 0
    attempt = {
        "attempt_id": gid("att_"), "quiz_id": quiz_id, "student_id": user["user_id"],
        "answers": answers, "score": pct, "passed": pct >= quiz.get("pass_mark", 70),
        "attempted_at": datetime.now(timezone.utc).isoformat()
    }
    db.quiz_attempts.insert_one(attempt)
    return {k: v for k, v in attempt.items() if k != "_id"}

# ============ ASSIGNMENTS ============
@app.get("/api/assignments")
async def list_assignments(request: Request, course_id: Optional[str] = None):
    user = get_user(request)
    query = {}
    if course_id: query["course_id"] = course_id
    if user["role"] == "instructor":
        query["course_id"] = {"$in": [c["course_id"] for c in db.courses.find({"instructor_ids": user["user_id"]}, {"course_id": 1, "_id": 0})]}
    assignments = list(db.assignments.find(query, {"_id": 0}))
    for a in assignments:
        a["submission_count"] = db.submissions.count_documents({"assignment_id": a["assignment_id"]})
    return assignments

@app.post("/api/assignments")
async def create_assignment(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    body = await request.json()
    assignment = {
        "assignment_id": gid("asgn_"), "title": body["title"],
        "description": body.get("description", ""), "course_id": body.get("course_id", ""),
        "module_id": body.get("module_id", ""), "due_date": body.get("due_date", ""),
        "allow_file_upload": body.get("allow_file_upload", True),
        "allow_text_submission": body.get("allow_text_submission", True),
        "allow_resubmission": body.get("allow_resubmission", False),
        "max_score": body.get("max_score", 100),
        "created_by": user["user_id"], "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.assignments.insert_one(assignment)
    return {k: v for k, v in assignment.items() if k != "_id"}

@app.put("/api/assignments/{assignment_id}")
async def update_assignment(assignment_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    body = await request.json()
    db.assignments.update_one({"assignment_id": assignment_id}, {"$set": {k: v for k, v in body.items() if k not in ["assignment_id", "_id"]}})
    return db.assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})

@app.delete("/api/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    db.assignments.delete_one({"assignment_id": assignment_id})
    return {"message": "Assignment deleted"}

@app.post("/api/assignments/{assignment_id}/submit")
async def submit_assignment(assignment_id: str, request: Request):
    user = get_user(request)
    body = await request.json()
    submission = {
        "submission_id": gid("sub_"), "assignment_id": assignment_id,
        "student_id": user["user_id"], "content": body.get("content", ""),
        "file_url": body.get("file_url", ""), "grade": None, "feedback": "",
        "graded_by": "", "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    db.submissions.insert_one(submission)
    return {k: v for k, v in submission.items() if k != "_id"}

@app.get("/api/submissions")
async def list_submissions(request: Request, assignment_id: Optional[str] = None):
    user = get_user(request)
    query = {}
    if assignment_id: query["assignment_id"] = assignment_id
    if user["role"] == "student": query["student_id"] = user["user_id"]
    subs = list(db.submissions.find(query, {"_id": 0}))
    for s in subs:
        student = db.users.find_one({"user_id": s["student_id"]}, {"_id": 0, "password_hash": 0})
        s["student_name"] = student["name"] if student else "Unknown"
    return subs

@app.put("/api/submissions/{submission_id}/grade")
async def grade_submission(submission_id: str, request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    body = await request.json()
    db.submissions.update_one({"submission_id": submission_id}, {"$set": {
        "grade": body.get("grade"), "feedback": body.get("feedback", ""),
        "graded_by": user["user_id"], "graded_at": datetime.now(timezone.utc).isoformat()
    }})
    return db.submissions.find_one({"submission_id": submission_id}, {"_id": 0})

# ============ ENROLLMENTS ============
@app.post("/api/enrollments")
async def enroll(request: Request):
    user = get_user(request)
    body = await request.json()
    student_id = body.get("student_id", user["user_id"])
    course_id = body["course_id"]
    if db.enrollments.find_one({"student_id": student_id, "course_id": course_id}):
        raise HTTPException(400, "Already enrolled")
    enrollment = {
        "enrollment_id": gid("enr_"), "student_id": student_id, "course_id": course_id,
        "progress": 0, "status": "active", "completed_lessons": [],
        "enrolled_at": datetime.now(timezone.utc).isoformat()
    }
    db.enrollments.insert_one(enrollment)
    return {k: v for k, v in enrollment.items() if k != "_id"}

@app.get("/api/enrollments")
async def list_enrollments(request: Request, student_id: Optional[str] = None, course_id: Optional[str] = None):
    user = get_user(request)
    query = {}
    if student_id: query["student_id"] = student_id
    elif user["role"] == "student": query["student_id"] = user["user_id"]
    if course_id: query["course_id"] = course_id
    enrollments = list(db.enrollments.find(query, {"_id": 0}))
    for e in enrollments:
        course = db.courses.find_one({"course_id": e["course_id"]}, {"_id": 0})
        e["course_title"] = course["title"] if course else "Unknown"
        e["course_thumbnail"] = course.get("thumbnail", "") if course else ""
        e["course_category"] = course.get("category", "") if course else ""
        e["total_lessons"] = db.lessons.count_documents({"course_id": e["course_id"]})
        student = db.users.find_one({"user_id": e["student_id"]}, {"_id": 0, "password_hash": 0})
        e["student_name"] = student["name"] if student else "Unknown"
    return enrollments

@app.post("/api/admin/students/enroll")
async def admin_enroll_student(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin"])
    body = await request.json()
    student_id = body["student_id"]
    course_ids = body.get("course_ids", [])
    # Get current enrollments for this student
    existing = list(db.enrollments.find({"student_id": student_id}, {"_id": 0}))
    existing_course_ids = {e["course_id"] for e in existing}
    # Add new enrollments
    added = []
    for cid in course_ids:
        if cid not in existing_course_ids:
            enrollment = {
                "enrollment_id": gid("enr_"), "student_id": student_id, "course_id": cid,
                "progress": 0, "status": "active", "completed_lessons": [],
                "enrolled_at": datetime.now(timezone.utc).isoformat()
            }
            db.enrollments.insert_one(enrollment)
            added.append(cid)
    # Remove enrollments not in the new list
    removed = []
    for e in existing:
        if e["course_id"] not in course_ids:
            db.enrollments.delete_one({"enrollment_id": e["enrollment_id"]})
            removed.append(e["course_id"])
    return {"message": "Enrollments updated", "added": added, "removed": removed}

@app.delete("/api/enrollments/{enrollment_id}")
async def unenroll(enrollment_id: str, request: Request):
    get_user(request)
    db.enrollments.delete_one({"enrollment_id": enrollment_id})
    return {"message": "Unenrolled"}

# ============ ANALYTICS ============
@app.get("/api/analytics/overview")
async def analytics_overview(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    total_students = db.users.count_documents({"role": "student"})
    total_instructors = db.users.count_documents({"role": "instructor"})
    total_courses = db.courses.count_documents({})
    active_enrollments = db.enrollments.count_documents({"status": "active"})
    completed_enrollments = db.enrollments.count_documents({"status": "completed"})
    total_enrollments = db.enrollments.count_documents({})
    completion_rate = round(completed_enrollments / total_enrollments * 100, 1) if total_enrollments > 0 else 0
    all_enr = list(db.enrollments.find({}, {"_id": 0, "progress": 1}))
    avg_progress = round(sum(e.get("progress", 0) for e in all_enr) / len(all_enr), 1) if all_enr else 0
    pending_submissions = db.submissions.count_documents({"grade": None})
    recent_signups = list(db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(5))
    recent_activity = list(db.activity_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(10))
    for a in recent_activity:
        u = db.users.find_one({"user_id": a.get("user_id")}, {"_id": 0, "name": 1})
        a["user_name"] = u["name"] if u else "Unknown"
    return {
        "total_students": total_students, "total_instructors": total_instructors,
        "total_courses": total_courses, "active_enrollments": active_enrollments,
        "completion_rate": completion_rate, "avg_progress": avg_progress,
        "pending_submissions": pending_submissions, "total_certificates": db.certificates.count_documents({}),
        "total_quizzes": db.quizzes.count_documents({}), "total_assignments": db.assignments.count_documents({}),
        "recent_signups": recent_signups, "recent_activity": recent_activity,
        "completed_enrollments": completed_enrollments, "total_enrollments": total_enrollments
    }

@app.get("/api/analytics/students")
async def analytics_students(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    students = list(db.users.find({"role": "student"}, {"_id": 0, "password_hash": 0}))
    for s in students:
        enrs = list(db.enrollments.find({"student_id": s["user_id"]}, {"_id": 0}))
        s["enrolled_count"] = len(enrs)
        s["avg_progress"] = round(sum(e.get("progress", 0) for e in enrs) / len(enrs), 1) if enrs else 0
        s["completed_courses"] = sum(1 for e in enrs if e.get("status") == "completed")
        s["quiz_attempts"] = db.quiz_attempts.count_documents({"student_id": s["user_id"]})
        last_log = db.activity_logs.find_one({"user_id": s["user_id"]}, {"_id": 0}, sort=[("timestamp", -1)])
        s["last_active"] = last_log["timestamp"] if last_log else s.get("created_at", "")
    return students

@app.get("/api/analytics/courses")
async def analytics_courses(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    courses = list(db.courses.find({}, {"_id": 0}))
    for c in courses:
        enrs = list(db.enrollments.find({"course_id": c["course_id"]}, {"_id": 0}))
        c["total_enrollments"] = len(enrs)
        c["completion_rate"] = round(sum(1 for e in enrs if e.get("status") == "completed") / len(enrs) * 100, 1) if enrs else 0
        c["avg_progress"] = round(sum(e.get("progress", 0) for e in enrs) / len(enrs), 1) if enrs else 0
        c["lesson_count"] = db.lessons.count_documents({"course_id": c["course_id"]})
    return courses

@app.get("/api/analytics/instructors")
async def analytics_instructors(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin"])
    instructors = list(db.users.find({"role": "instructor"}, {"_id": 0, "password_hash": 0}))
    for i in instructors:
        courses = list(db.courses.find({"instructor_ids": i["user_id"]}, {"_id": 0}))
        i["course_count"] = len(courses)
        cids = [c["course_id"] for c in courses]
        i["total_students"] = db.enrollments.count_documents({"course_id": {"$in": cids}})
        i["graded_submissions"] = db.submissions.count_documents({"graded_by": i["user_id"]})
    return instructors

# ============ NOTIFICATIONS ============
@app.get("/api/notifications")
async def list_notifications(request: Request):
    user = get_user(request)
    query = {"$or": [{"target_role": "all"}, {"target_role": user["role"]}, {"target_users": user["user_id"]}]}
    notifs = list(db.notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(50))
    for n in notifs:
        n["is_read"] = user["user_id"] in n.get("read_by", [])
    return notifs

@app.post("/api/notifications")
async def create_notification(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin", "instructor"])
    body = await request.json()
    notif = {
        "notification_id": gid("notif_"), "title": body["title"],
        "message": body.get("message", ""), "type": body.get("type", "announcement"),
        "target_role": body.get("target_role", "all"), "target_users": body.get("target_users", []),
        "created_by": user["user_id"], "read_by": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.notifications.insert_one(notif)
    return {k: v for k, v in notif.items() if k != "_id"}

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, request: Request):
    user = get_user(request)
    db.notifications.update_one({"notification_id": notification_id}, {"$addToSet": {"read_by": user["user_id"]}})
    return {"message": "Marked as read"}

# ============ CERTIFICATES ============
@app.get("/api/certificates")
async def list_certificates(request: Request, student_id: Optional[str] = None):
    user = get_user(request)
    query = {}
    if student_id: query["student_id"] = student_id
    elif user["role"] == "student": query["student_id"] = user["user_id"]
    certs = list(db.certificates.find(query, {"_id": 0}))
    for c in certs:
        course = db.courses.find_one({"course_id": c.get("course_id")}, {"_id": 0})
        c["course_title"] = course["title"] if course else "Unknown"
        student = db.users.find_one({"user_id": c.get("student_id")}, {"_id": 0, "password_hash": 0})
        c["student_name"] = student["name"] if student else "Unknown"
    return certs

@app.post("/api/certificates/templates")
async def create_cert_template(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin"])
    body = await request.json()
    template = {"template_id": gid("tmpl_"), "name": body["name"], "description": body.get("description", ""), "course_id": body.get("course_id", ""), "created_at": datetime.now(timezone.utc).isoformat()}
    db.cert_templates.insert_one(template)
    return {k: v for k, v in template.items() if k != "_id"}

@app.post("/api/certificates/issue")
async def issue_certificate(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin"])
    body = await request.json()
    cert = {"certificate_id": gid("cert_"), "student_id": body["student_id"], "course_id": body["course_id"], "template_id": body.get("template_id", ""), "issued_by": user["user_id"], "issued_at": datetime.now(timezone.utc).isoformat()}
    db.certificates.insert_one(cert)
    return {k: v for k, v in cert.items() if k != "_id"}

# ============ SETTINGS ============
@app.get("/api/settings")
async def get_settings(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin"])
    s = db.settings.find_one({"key": "platform"}, {"_id": 0})
    return s or {"key": "platform", "name": "Kids In Tech LMS", "logo": "", "primary_color": "#0D9488"}

@app.put("/api/settings")
async def update_settings(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin"])
    body = await request.json()
    body["key"] = "platform"
    db.settings.update_one({"key": "platform"}, {"$set": body}, upsert=True)
    return db.settings.find_one({"key": "platform"}, {"_id": 0})

# ============ ROLES ============
@app.get("/api/roles")
async def list_roles(request: Request):
    user = get_user(request)
    require_role(user, ["super_admin"])
    roles = list(db.roles.find({}, {"_id": 0}))
    if not roles:
        defaults = [
            {"role_id": "super_admin", "name": "Super Admin", "permissions": ["*"]},
            {"role_id": "instructor", "name": "Instructor", "permissions": ["create_lessons", "edit_lessons", "create_quizzes", "grade_assignments", "view_student_progress"]},
            {"role_id": "student", "name": "Student", "permissions": ["view_courses", "take_quizzes", "submit_assignments"]}
        ]
        db.roles.insert_many(defaults)
        return defaults
    return roles

# ============ SEED DATA ============
@app.post("/api/seed")
async def seed_data():
    for col in ["users", "courses", "modules", "lessons", "quizzes", "assignments", "enrollments", "quiz_attempts", "submissions", "notifications", "certificates", "cert_templates", "activity_logs", "settings", "roles", "user_sessions", "password_resets"]:
        db[col].delete_many({})

    now = datetime.now(timezone.utc).isoformat()

    # Admin - Kids In Tech
    db.users.insert_one({"user_id": "user_admin001", "email": "admin@kidsintech.school", "name": "Alex Morgan", "password_hash": hpw("innovate@2025"), "role": "super_admin", "picture": "", "bio": "KIT Platform Administrator", "status": "active", "points": 0, "must_reset_password": False, "created_at": now})

    # Instructors
    instructors = [
        {"user_id": "user_inst001", "email": "sarah@kidsintech.school", "name": "Sarah Chen", "password_hash": hpw("instructor123"), "role": "instructor", "picture": "", "bio": "Senior Web Development Instructor - 10+ years teaching coding to kids", "status": "active", "points": 0, "must_reset_password": False, "created_at": now},
        {"user_id": "user_inst002", "email": "james@kidsintech.school", "name": "James Wilson", "password_hash": hpw("instructor123"), "role": "instructor", "picture": "", "bio": "Data Science Educator - Making complex topics fun and accessible", "status": "active", "points": 0, "must_reset_password": False, "created_at": now},
        {"user_id": "user_inst003", "email": "maria@kidsintech.school", "name": "Maria Garcia", "password_hash": hpw("instructor123"), "role": "instructor", "picture": "", "bio": "Creative Design Teacher - Inspiring the next generation of designers", "status": "active", "points": 0, "must_reset_password": False, "created_at": now},
    ]
    db.users.insert_many(instructors)

    # Students
    student_names = ["Liam Johnson", "Emma Williams", "Noah Brown", "Olivia Davis", "Ethan Martinez", "Ava Anderson", "Mason Taylor", "Sophia Thomas", "Lucas Jackson", "Isabella White"]
    students = []
    for i, name in enumerate(student_names):
        students.append({"user_id": f"user_stu{i+1:03d}", "email": f"{name.split()[0].lower()}@student.kidsintech.school", "name": name, "password_hash": hpw("student123"), "role": "student", "picture": "", "bio": "Enthusiastic learner", "status": "active", "points": (i+1)*50, "must_reset_password": False, "created_at": now})
    db.users.insert_many(students)

    # Courses
    courses_data = [
        {"course_id": "course_001", "title": "Full-Stack Web Development", "slug": "fullstack-web-dev", "description": "Master modern web development from frontend to backend. Learn React, Node.js, and MongoDB.", "thumbnail": "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400", "category": "Development", "level": "intermediate", "duration_weeks": 12, "instructor_ids": ["user_inst001"], "status": "published", "visibility": "public", "prerequisites": "Basic HTML/CSS", "certificate_enabled": True},
        {"course_id": "course_002", "title": "Data Science Fundamentals", "slug": "data-science-fundamentals", "description": "Learn Python, Pandas, and machine learning basics to kickstart your data science career.", "thumbnail": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400", "category": "Data Science", "level": "beginner", "duration_weeks": 8, "instructor_ids": ["user_inst002"], "status": "published", "visibility": "public", "prerequisites": "", "certificate_enabled": True},
        {"course_id": "course_003", "title": "Creative Design Masterclass", "slug": "creative-design", "description": "Create stunning interfaces and experiences. From wireframes to high-fidelity prototypes.", "thumbnail": "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400", "category": "Design", "level": "beginner", "duration_weeks": 6, "instructor_ids": ["user_inst003"], "status": "published", "visibility": "public", "prerequisites": "", "certificate_enabled": True},
        {"course_id": "course_004", "title": "Advanced Python Programming", "slug": "advanced-python", "description": "Deep dive into Python: decorators, generators, async programming, and design patterns.", "thumbnail": "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400", "category": "Development", "level": "advanced", "duration_weeks": 10, "instructor_ids": ["user_inst001", "user_inst002"], "status": "published", "visibility": "public", "prerequisites": "Python basics", "certificate_enabled": True},
        {"course_id": "course_005", "title": "Digital Marketing Strategy", "slug": "digital-marketing", "description": "Learn SEO, social media marketing, email campaigns, and analytics.", "thumbnail": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400", "category": "Marketing", "level": "beginner", "duration_weeks": 4, "instructor_ids": ["user_inst003"], "status": "draft", "visibility": "private", "prerequisites": "", "certificate_enabled": False},
    ]
    for c in courses_data:
        c["created_by"] = c["instructor_ids"][0]
        c["created_at"] = now
        c["updated_at"] = now
    db.courses.insert_many(courses_data)

    # Modules & Lessons
    modules_lessons = {
        "course_001": [
            {"title": "Getting Started with Web Dev", "lessons": [
                {"title": "Introduction to Web Development", "type": "video", "content": "<h2>Welcome to Web Development</h2><p>In this lesson, we'll explore the fundamentals of web development, including the core technologies: HTML, CSS, and JavaScript.</p><ul><li><strong>Frontend</strong> - What users see and interact with</li><li><strong>Backend</strong> - Server-side logic and databases</li></ul>", "duration": "15 min"},
                {"title": "Setting Up Your Environment", "type": "text", "content": "<h2>Development Environment Setup</h2><p>Before coding, set up your development environment:</p><ol><li>Install <strong>VS Code</strong></li><li>Install <strong>Node.js</strong></li><li>Install <strong>Git</strong></li></ol><pre><code>node --version\nnpm --version</code></pre>", "duration": "10 min"},
                {"title": "HTML Fundamentals", "type": "text", "content": "<h2>HTML Basics</h2><p>HTML is the standard markup language for web pages.</p><pre><code>&lt;!DOCTYPE html&gt;\n&lt;html&gt;\n&lt;head&gt;&lt;title&gt;My Page&lt;/title&gt;&lt;/head&gt;\n&lt;body&gt;&lt;h1&gt;Hello World!&lt;/h1&gt;&lt;/body&gt;\n&lt;/html&gt;</code></pre>", "duration": "20 min"},
            ]},
            {"title": "CSS & Styling", "lessons": [
                {"title": "CSS Fundamentals", "type": "text", "content": "<h2>CSS Basics</h2><p>CSS controls the visual presentation of web pages.</p><pre><code>body { font-family: sans-serif; }\nh1 { color: #333; }</code></pre>", "duration": "20 min"},
                {"title": "Flexbox & Grid", "type": "video", "content": "<h2>Modern CSS Layouts</h2><p>Flexbox and CSS Grid make responsive designs easy.</p>", "duration": "25 min"},
            ]},
            {"title": "JavaScript Essentials", "lessons": [
                {"title": "JavaScript Basics", "type": "text", "content": "<h2>Intro to JavaScript</h2><pre><code>const greeting = 'Hello!';\nconsole.log(greeting);</code></pre>", "duration": "30 min"},
                {"title": "DOM Manipulation", "type": "video", "content": "<h2>Working with the DOM</h2><p>The DOM is a programming interface for web documents.</p>", "duration": "25 min"},
                {"title": "Async JavaScript", "type": "text", "content": "<h2>Asynchronous JS</h2><pre><code>async function fetchData() {\n  const res = await fetch('/api/data');\n  return await res.json();\n}</code></pre>", "duration": "35 min"},
            ]},
            {"title": "React Framework", "lessons": [
                {"title": "Introduction to React", "type": "video", "content": "<h2>React.js</h2><p>React is a library for building user interfaces.</p>", "duration": "20 min"},
                {"title": "Components & Props", "type": "text", "content": "<h2>React Components</h2><pre><code>function Welcome({ name }) {\n  return &lt;h1&gt;Hello, {name}!&lt;/h1&gt;;\n}</code></pre>", "duration": "25 min"},
            ]},
        ],
        "course_002": [
            {"title": "Python for Data Science", "lessons": [
                {"title": "Python Refresher", "type": "text", "content": "<h2>Python Basics Review</h2><p>Quick review of Python fundamentals.</p>", "duration": "20 min"},
                {"title": "NumPy Fundamentals", "type": "text", "content": "<h2>NumPy Arrays</h2><p>NumPy is the package for numerical computing.</p>", "duration": "25 min"},
                {"title": "Pandas DataFrames", "type": "video", "content": "<h2>Working with Pandas</h2><p>Pandas provides data structures for data manipulation.</p>", "duration": "30 min"},
            ]},
            {"title": "Data Visualization", "lessons": [
                {"title": "Matplotlib Basics", "type": "text", "content": "<h2>Creating Charts</h2><p>Matplotlib is the most popular plotting library.</p>", "duration": "20 min"},
                {"title": "Seaborn for Statistical Viz", "type": "video", "content": "<h2>Statistical Visualization</h2><p>Seaborn makes beautiful statistical graphics easy.</p>", "duration": "25 min"},
            ]},
        ],
        "course_003": [
            {"title": "Design Fundamentals", "lessons": [
                {"title": "Design Principles", "type": "text", "content": "<h2>Core Principles</h2><p>Contrast, alignment, repetition, and proximity.</p>", "duration": "15 min"},
                {"title": "Color Theory", "type": "video", "content": "<h2>Understanding Color</h2><p>Color theory is fundamental to design.</p>", "duration": "20 min"},
                {"title": "Typography", "type": "text", "content": "<h2>Typography Essentials</h2><p>Good typography is the foundation of good design.</p>", "duration": "15 min"},
            ]},
        ],
        "course_004": [
            {"title": "Advanced Python Concepts", "lessons": [
                {"title": "Decorators Deep Dive", "type": "text", "content": "<h2>Python Decorators</h2><p>Decorators modify function behavior.</p>", "duration": "30 min"},
                {"title": "Generators & Iterators", "type": "text", "content": "<h2>Lazy Evaluation</h2><p>Generators are memory-efficient.</p>", "duration": "25 min"},
            ]},
        ],
    }

    all_lesson_ids = []
    for course_id, mods in modules_lessons.items():
        for mi, mod_data in enumerate(mods):
            mod_id = gid("mod_")
            db.modules.insert_one({"module_id": mod_id, "course_id": course_id, "title": mod_data["title"], "description": f"Module {mi+1}", "order": mi + 1, "estimated_duration": "2 hours", "unlock_rule": "sequential", "created_at": now})
            for li, les_data in enumerate(mod_data["lessons"]):
                les_id = gid("les_")
                db.lessons.insert_one({"lesson_id": les_id, "module_id": mod_id, "course_id": course_id, "title": les_data["title"], "type": les_data["type"], "duration": les_data["duration"], "content": les_data["content"], "video_url": "", "youtube_url": "", "order": li + 1, "status": "published", "quiz_id": "", "created_at": now})
                all_lesson_ids.append({"lesson_id": les_id, "course_id": course_id})

    # Quizzes
    db.quizzes.insert_many([
        {"quiz_id": "quiz_001", "title": "HTML & CSS Quiz", "course_id": "course_001", "questions": [
            {"question_id": "q1", "question": "What does HTML stand for?", "type": "multiple_choice", "options": ["Hyper Text Markup Language", "High Tech Modern Language", "Hyper Transfer Markup Language", "Home Tool Markup Language"], "correct_answer": "Hyper Text Markup Language"},
            {"question_id": "q2", "question": "CSS stands for Cascading Style Sheets", "type": "true_false", "options": ["True", "False"], "correct_answer": "True"},
            {"question_id": "q3", "question": "Which property changes background color?", "type": "multiple_choice", "options": ["bgcolor", "background-color", "color", "background"], "correct_answer": "background-color"},
        ], "time_limit": 15, "attempts_allowed": 3, "pass_mark": 70, "auto_grade": True, "created_by": "user_inst001", "created_at": now},
        {"quiz_id": "quiz_002", "title": "JavaScript Basics", "course_id": "course_001", "questions": [
            {"question_id": "q4", "question": "JavaScript is compiled", "type": "true_false", "options": ["True", "False"], "correct_answer": "False"},
            {"question_id": "q5", "question": "Which declares a constant?", "type": "multiple_choice", "options": ["var", "let", "const", "define"], "correct_answer": "const"},
        ], "time_limit": 10, "attempts_allowed": 2, "pass_mark": 60, "auto_grade": True, "created_by": "user_inst001", "created_at": now},
        {"quiz_id": "quiz_003", "title": "Python Data Types", "course_id": "course_002", "questions": [
            {"question_id": "q6", "question": "Which is not a Python type?", "type": "multiple_choice", "options": ["list", "tuple", "array", "dict"], "correct_answer": "array"},
            {"question_id": "q7", "question": "Python lists are mutable", "type": "true_false", "options": ["True", "False"], "correct_answer": "True"},
        ], "time_limit": 10, "attempts_allowed": 3, "pass_mark": 70, "auto_grade": True, "created_by": "user_inst002", "created_at": now},
    ])

    # Assignments
    db.assignments.insert_many([
        {"assignment_id": "asgn_001", "title": "Build a Landing Page", "description": "Create a responsive landing page using HTML and CSS.", "course_id": "course_001", "module_id": "", "due_date": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(), "allow_file_upload": True, "allow_text_submission": True, "allow_resubmission": True, "max_score": 100, "created_by": "user_inst001", "created_at": now},
        {"assignment_id": "asgn_002", "title": "Data Analysis Project", "description": "Analyze the provided dataset using Pandas.", "course_id": "course_002", "module_id": "", "due_date": (datetime.now(timezone.utc) + timedelta(days=21)).isoformat(), "allow_file_upload": True, "allow_text_submission": False, "allow_resubmission": False, "max_score": 100, "created_by": "user_inst002", "created_at": now},
        {"assignment_id": "asgn_003", "title": "Design a Mobile App UI", "description": "Create wireframes and a mockup for a mobile app.", "course_id": "course_003", "module_id": "", "due_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(), "allow_file_upload": True, "allow_text_submission": True, "allow_resubmission": True, "max_score": 100, "created_by": "user_inst003", "created_at": now},
    ])

    # Enrollments
    enrollments = []
    for i, s in enumerate(students):
        num_courses = random.randint(1, 3)
        enrolled_courses = random.sample(["course_001", "course_002", "course_003", "course_004"], min(num_courses, 4))
        for cid in enrolled_courses:
            course_lessons = [l for l in all_lesson_ids if l["course_id"] == cid]
            num_completed = random.randint(0, len(course_lessons))
            completed = [l["lesson_id"] for l in random.sample(course_lessons, num_completed)] if course_lessons else []
            progress = round(len(completed) / len(course_lessons) * 100, 1) if course_lessons else 0
            status = "completed" if progress >= 100 else "active"
            e = {"enrollment_id": gid("enr_"), "student_id": s["user_id"], "course_id": cid, "progress": progress, "status": status, "completed_lessons": completed, "enrolled_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 60))).isoformat()}
            if status == "completed": e["completed_at"] = now
            enrollments.append(e)
    if enrollments: db.enrollments.insert_many(enrollments)

    # Quiz attempts, submissions, certs, notifs, logs
    attempts = []
    for e in enrollments[:8]:
        quiz = db.quizzes.find_one({"course_id": e["course_id"]}, {"_id": 0})
        if quiz:
            score = random.randint(40, 100)
            attempts.append({"attempt_id": gid("att_"), "quiz_id": quiz["quiz_id"], "student_id": e["student_id"], "answers": [], "score": score, "passed": score >= quiz.get("pass_mark", 70), "attempted_at": now})
    if attempts: db.quiz_attempts.insert_many(attempts)

    subs = []
    for e in enrollments[:5]:
        asgn = db.assignments.find_one({"course_id": e["course_id"]}, {"_id": 0})
        if asgn:
            graded = random.choice([True, False])
            subs.append({"submission_id": gid("sub_"), "assignment_id": asgn["assignment_id"], "student_id": e["student_id"], "content": "My submission.", "file_url": "", "grade": random.randint(60, 100) if graded else None, "feedback": "Good work!" if graded else "", "graded_by": "user_inst001" if graded else "", "submitted_at": now})
    if subs: db.submissions.insert_many(subs)

    certs = [{"certificate_id": gid("cert_"), "student_id": e["student_id"], "course_id": e["course_id"], "template_id": "", "issued_by": "user_admin001", "issued_at": now} for e in enrollments if e["status"] == "completed"]
    if certs: db.certificates.insert_many(certs)

    db.notifications.insert_many([
        {"notification_id": "notif_001", "title": "Welcome to Kids In Tech!", "message": "Start exploring courses and begin your learning journey!", "type": "announcement", "target_role": "all", "target_users": [], "created_by": "user_admin001", "read_by": [], "created_at": now},
        {"notification_id": "notif_002", "title": "New Course Available", "message": "Advanced Python Programming is now available. Enroll today!", "type": "announcement", "target_role": "student", "target_users": [], "created_by": "user_admin001", "read_by": [], "created_at": now},
        {"notification_id": "notif_003", "title": "Assignment Due Reminder", "message": "Build a Landing Page is due in 7 days.", "type": "reminder", "target_role": "student", "target_users": [], "created_by": "user_inst001", "read_by": [], "created_at": now},
    ])

    logs = []
    for e in enrollments:
        logs.append({"log_id": gid("log_"), "user_id": e["student_id"], "action": "enrolled", "details": {"course_id": e["course_id"]}, "timestamp": e["enrolled_at"]})
    if logs: db.activity_logs.insert_many(logs)

    db.settings.insert_one({"key": "platform", "name": "Kids In Tech LMS", "logo": "", "primary_color": "#0D9488"})

    return {"message": "Database seeded successfully", "stats": {
        "users": db.users.count_documents({}), "courses": db.courses.count_documents({}),
        "modules": db.modules.count_documents({}), "lessons": db.lessons.count_documents({}),
        "quizzes": db.quizzes.count_documents({}), "assignments": db.assignments.count_documents({}),
        "enrollments": db.enrollments.count_documents({}), "notifications": db.notifications.count_documents({})
    }}

@app.get("/api/health")
async def health():
    return {"status": "ok"}
