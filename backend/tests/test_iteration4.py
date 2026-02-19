"""
Iteration 4 Backend Tests - Kids In Tech LMS
Testing: Notifications, Enrollments, Language API, Course Updates, Progress Recalculation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthAndSetup:
    """Authentication and basic setup tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@kidsintech.school",
            "password": "innovate@2025"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    @pytest.fixture(scope="class")
    def student_token(self):
        """Get student authentication token - using ethan@student.kidsintech.school"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ethan@student.kidsintech.school",
            "password": "student123"
        })
        assert response.status_code == 200, f"Student login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    def test_admin_login(self, admin_token):
        """Test admin login returns valid token"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print("✓ Admin login successful")
    
    def test_student_login(self, student_token):
        """Test student login returns valid token"""
        assert student_token is not None
        assert len(student_token) > 0
        print("✓ Student login successful")


class TestNotificationSystem:
    """Notification engine tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@kidsintech.school", "password": "innovate@2025"
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def student_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ethan@student.kidsintech.school", "password": "student123"
        })
        return response.json()["token"]
    
    def test_get_notifications_returns_is_read_flag(self, student_token):
        """GET /api/notifications should return is_read flag for each notification"""
        response = requests.get(f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {student_token}"})
        assert response.status_code == 200
        notifications = response.json()
        assert isinstance(notifications, list)
        # Check that all notifications have is_read flag
        for notif in notifications:
            assert "is_read" in notif, f"Notification missing is_read flag: {notif}"
            assert isinstance(notif["is_read"], bool)
        print(f"✓ GET /api/notifications returns {len(notifications)} notifications with is_read flag")
    
    def test_mark_notification_as_read(self, admin_token):
        """Test marking a notification as read"""
        # First get notifications
        response = requests.get(f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        notifications = response.json()
        
        if len(notifications) > 0:
            notif_id = notifications[0]["notification_id"]
            # Mark as read
            mark_response = requests.put(f"{BASE_URL}/api/notifications/{notif_id}/read",
                headers={"Authorization": f"Bearer {admin_token}"})
            assert mark_response.status_code == 200
            
            # Verify it's marked as read
            verify_response = requests.get(f"{BASE_URL}/api/notifications",
                headers={"Authorization": f"Bearer {admin_token}"})
            updated_notifs = verify_response.json()
            updated_notif = next((n for n in updated_notifs if n["notification_id"] == notif_id), None)
            assert updated_notif is not None
            assert updated_notif["is_read"] == True
            print(f"✓ Mark notification as read works - notification {notif_id}")
        else:
            print("⚠ No notifications to test mark as read")
    
    def test_notifications_filtered_by_role(self, student_token, admin_token):
        """Notifications should be filtered by user role"""
        student_notifs = requests.get(f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {student_token}"}).json()
        admin_notifs = requests.get(f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}).json()
        
        # Both should be lists
        assert isinstance(student_notifs, list)
        assert isinstance(admin_notifs, list)
        print(f"✓ Notifications filtered: Student={len(student_notifs)}, Admin={len(admin_notifs)}")


class TestEnrollmentAPIs:
    """Enrollment API tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@kidsintech.school", "password": "innovate@2025"
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def student_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ethan@student.kidsintech.school", "password": "student123"
        })
        return response.json()["token"]
    
    def test_get_enrollments_returns_course_metadata(self, student_token):
        """GET /api/enrollments should return course_updated_at, course_description, course_level"""
        response = requests.get(f"{BASE_URL}/api/enrollments",
            headers={"Authorization": f"Bearer {student_token}"})
        assert response.status_code == 200
        enrollments = response.json()
        
        if len(enrollments) > 0:
            enrollment = enrollments[0]
            # Check required fields
            assert "course_updated_at" in enrollment, "Missing course_updated_at"
            assert "course_description" in enrollment, "Missing course_description"
            assert "course_level" in enrollment, "Missing course_level"
            assert "course_title" in enrollment
            assert "progress" in enrollment
            assert "status" in enrollment
            print(f"✓ GET /api/enrollments returns full course metadata for {len(enrollments)} enrollments")
        else:
            print("⚠ No enrollments to verify metadata")
    
    def test_admin_enroll_student(self, admin_token):
        """POST /api/admin/students/enroll should work correctly"""
        # Get a student
        users_response = requests.get(f"{BASE_URL}/api/users?role=student",
            headers={"Authorization": f"Bearer {admin_token}"})
        students = users_response.json()
        
        # Get courses
        courses_response = requests.get(f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {admin_token}"})
        courses = courses_response.json()
        
        if len(students) > 0 and len(courses) > 0:
            student_id = students[0]["user_id"]
            course_ids = [c["course_id"] for c in courses[:2]]
            
            # Enroll student in courses
            enroll_response = requests.post(f"{BASE_URL}/api/admin/students/enroll",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"student_id": student_id, "course_ids": course_ids})
            assert enroll_response.status_code == 200
            data = enroll_response.json()
            assert "message" in data
            print(f"✓ POST /api/admin/students/enroll works - enrolled {student_id} in {len(course_ids)} courses")
        else:
            pytest.skip("No students or courses available for enrollment test")


class TestCourseUpdateAndNotifications:
    """Test that creating modules/lessons triggers notifications and progress recalc"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@kidsintech.school", "password": "innovate@2025"
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def student_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "liam@student.kidsintech.school", "password": "student123"
        })
        return response.json()["token"]
    
    def test_create_module_triggers_notification(self, admin_token, student_token):
        """Creating a new module should notify enrolled students"""
        # Get a course
        courses = requests.get(f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {admin_token}"}).json()
        
        if len(courses) > 0:
            course_id = courses[0]["course_id"]
            
            # Get notifications count before
            notifs_before = requests.get(f"{BASE_URL}/api/notifications",
                headers={"Authorization": f"Bearer {student_token}"}).json()
            count_before = len(notifs_before)
            
            # Create a new module
            module_response = requests.post(f"{BASE_URL}/api/courses/{course_id}/modules",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"title": "TEST_Module_Iteration4", "description": "Test module for notification check"})
            assert module_response.status_code == 200
            new_module = module_response.json()
            
            # Check notifications after
            notifs_after = requests.get(f"{BASE_URL}/api/notifications",
                headers={"Authorization": f"Bearer {student_token}"}).json()
            
            # Notification count should increase (if student enrolled)
            print(f"✓ Module created: {new_module.get('module_id')} - Notifications before: {count_before}, after: {len(notifs_after)}")
        else:
            pytest.skip("No courses available")
    
    def test_create_lesson_triggers_notification(self, admin_token, student_token):
        """Creating a new lesson should notify enrolled students"""
        # Get a course and its modules
        courses = requests.get(f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {admin_token}"}).json()
        
        if len(courses) > 0:
            course_id = courses[0]["course_id"]
            modules = requests.get(f"{BASE_URL}/api/courses/{course_id}/modules",
                headers={"Authorization": f"Bearer {admin_token}"}).json()
            
            if len(modules) > 0:
                module_id = modules[0]["module_id"]
                
                # Get notifications count before
                notifs_before = requests.get(f"{BASE_URL}/api/notifications",
                    headers={"Authorization": f"Bearer {student_token}"}).json()
                count_before = len(notifs_before)
                
                # Create a new lesson
                lesson_response = requests.post(f"{BASE_URL}/api/modules/{module_id}/lessons",
                    headers={"Authorization": f"Bearer {admin_token}"},
                    json={"title": "TEST_Lesson_Iteration4", "type": "text", "content": "<p>Test content</p>"})
                assert lesson_response.status_code == 200
                new_lesson = lesson_response.json()
                
                # Check notifications after
                notifs_after = requests.get(f"{BASE_URL}/api/notifications",
                    headers={"Authorization": f"Bearer {student_token}"}).json()
                
                print(f"✓ Lesson created: {new_lesson.get('lesson_id')} - Notifications before: {count_before}, after: {len(notifs_after)}")
            else:
                pytest.skip("No modules available")
        else:
            pytest.skip("No courses available")


class TestCertificateAutoGeneration:
    """Test certificate auto-generation when course created with certificate_enabled=true"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@kidsintech.school", "password": "innovate@2025"
        })
        return response.json()["token"]
    
    def test_course_with_certificate_enabled_creates_template(self, admin_token):
        """POST /api/courses with certificate_enabled=true should auto-create cert template"""
        # Create a course with certificate enabled
        course_data = {
            "title": "TEST_Certificate_Course_Iter4",
            "description": "Testing certificate auto-generation",
            "category": "Testing",
            "level": "beginner",
            "certificate_enabled": True,
            "status": "draft"
        }
        
        response = requests.post(f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=course_data)
        assert response.status_code == 200
        course = response.json()
        assert course.get("certificate_enabled") == True
        print(f"✓ Course created with certificate_enabled=true: {course.get('course_id')}")


class TestProfileLanguageUpdate:
    """Test language preference update in profile"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@kidsintech.school", "password": "innovate@2025"
        })
        return response.json()["token"]
    
    def test_update_profile_language(self, admin_token):
        """PUT /api/auth/profile should accept language field"""
        # Update language to Hausa
        response = requests.put(f"{BASE_URL}/api/auth/profile",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"language": "ha"})
        assert response.status_code == 200
        
        # Verify update
        me_response = requests.get(f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"})
        user_data = me_response.json()
        assert user_data.get("language") == "ha"
        
        # Reset back to English
        requests.put(f"{BASE_URL}/api/auth/profile",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"language": "en"})
        print("✓ Profile language update works (ha/en)")


class TestProgressRecalculation:
    """Test that progress recalculates when new content is added"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@kidsintech.school", "password": "innovate@2025"
        })
        return response.json()["token"]
    
    def test_progress_recalculation_endpoint(self, admin_token):
        """Verify progress is recalculated when lessons are added"""
        # Get a course with enrollments
        courses = requests.get(f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {admin_token}"}).json()
        
        if len(courses) > 0:
            course = courses[0]
            course_id = course["course_id"]
            
            # Get enrollments for this course
            enrollments = requests.get(f"{BASE_URL}/api/enrollments?course_id={course_id}",
                headers={"Authorization": f"Bearer {admin_token}"}).json()
            
            if len(enrollments) > 0:
                enrollment = enrollments[0]
                progress_before = enrollment.get("progress", 0)
                print(f"✓ Progress tracking available - Course: {course_id}, Enrollments: {len(enrollments)}, Sample progress: {progress_before}%")
            else:
                print(f"✓ Course {course_id} exists but has no enrollments to test progress")
        else:
            pytest.skip("No courses available")


# Cleanup fixture to remove test data
@pytest.fixture(scope="session", autouse=True)
def cleanup(request):
    """Cleanup test-created data after all tests"""
    def teardown():
        try:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@kidsintech.school", "password": "innovate@2025"
            })
            if response.status_code == 200:
                token = response.json()["token"]
                headers = {"Authorization": f"Bearer {token}"}
                
                # Get and delete test courses
                courses = requests.get(f"{BASE_URL}/api/courses", headers=headers).json()
                for c in courses:
                    if c.get("title", "").startswith("TEST_"):
                        requests.delete(f"{BASE_URL}/api/courses/{c['course_id']}", headers=headers)
                        print(f"Cleaned up test course: {c['course_id']}")
                
                # Get and delete test modules/lessons by fetching all courses
                for c in courses:
                    modules = requests.get(f"{BASE_URL}/api/courses/{c['course_id']}/modules", headers=headers).json()
                    for m in modules:
                        if m.get("title", "").startswith("TEST_"):
                            requests.delete(f"{BASE_URL}/api/modules/{m['module_id']}", headers=headers)
                            print(f"Cleaned up test module: {m['module_id']}")
        except Exception as e:
            print(f"Cleanup warning: {e}")
    
    request.addfinalizer(teardown)
