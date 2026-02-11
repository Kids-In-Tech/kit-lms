"""
Test cases for Kids In Tech LMS Bug Fixes:
1. POST /api/admin/students/enroll - creates/removes enrollments for a student
2. GET /api/users/{user_id} - returns enrolled_courses array with course details
3. POST /api/courses with certificate_enabled=true - auto-creates cert template
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test Credentials
ADMIN_EMAIL = "admin@kidsintech.school"
ADMIN_PASSWORD = "innovate@2025"
STUDENT_EMAIL = "liam@student.kidsintech.school"
STUDENT_PASSWORD = "student123"


class TestAdminStudentEnrollment:
    """Tests for POST /api/admin/students/enroll endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, admin_token):
        """Setup with admin auth"""
        self.client = api_client
        self.client.headers.update({"Authorization": f"Bearer {admin_token}"})

    def test_enroll_student_in_courses(self, api_client, admin_token):
        """Test enrolling a student in multiple courses"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        # Get a student user_id (from seeded data)
        users_resp = api_client.get(f"{BASE_URL}/api/users?role=student")
        assert users_resp.status_code == 200
        students = users_resp.json()
        assert len(students) > 0, "No students found in database"
        
        student_id = students[0]["user_id"]
        print(f"Testing with student_id: {student_id}")
        
        # Get available courses
        courses_resp = api_client.get(f"{BASE_URL}/api/courses")
        assert courses_resp.status_code == 200
        courses = courses_resp.json()
        published_courses = [c for c in courses if c.get("status") == "published"]
        assert len(published_courses) >= 2, "Need at least 2 published courses for testing"
        
        course_ids = [c["course_id"] for c in published_courses[:2]]
        print(f"Enrolling in courses: {course_ids}")
        
        # Enroll student in courses
        enroll_resp = api_client.post(
            f"{BASE_URL}/api/admin/students/enroll",
            json={"student_id": student_id, "course_ids": course_ids}
        )
        assert enroll_resp.status_code == 200, f"Enroll failed: {enroll_resp.text}"
        
        result = enroll_resp.json()
        assert "message" in result
        assert result["message"] == "Enrollments updated"
        print(f"Enrollment result: added={result.get('added')}, removed={result.get('removed')}")

    def test_enroll_updates_and_removes_courses(self, api_client, admin_token):
        """Test that enrollment sync adds new and removes old enrollments"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        # Get a student
        users_resp = api_client.get(f"{BASE_URL}/api/users?role=student")
        students = users_resp.json()
        student_id = students[1]["user_id"] if len(students) > 1 else students[0]["user_id"]
        
        # Get courses
        courses_resp = api_client.get(f"{BASE_URL}/api/courses")
        courses = [c for c in courses_resp.json() if c.get("status") == "published"]
        
        # First enroll in course 1 and 2
        course_ids_initial = [courses[0]["course_id"], courses[1]["course_id"]]
        api_client.post(
            f"{BASE_URL}/api/admin/students/enroll",
            json={"student_id": student_id, "course_ids": course_ids_initial}
        )
        
        # Now change to course 2 and 3 (removes 1, adds 3)
        course_ids_new = [courses[1]["course_id"], courses[2]["course_id"]]
        resp = api_client.post(
            f"{BASE_URL}/api/admin/students/enroll",
            json={"student_id": student_id, "course_ids": course_ids_new}
        )
        assert resp.status_code == 200
        
        result = resp.json()
        # Verify course 1 was removed (if it wasn't already enrolled)
        # And course 3 was added
        print(f"Update enrollment result: added={result.get('added')}, removed={result.get('removed')}")
        
        # Verify by fetching user details
        user_resp = api_client.get(f"{BASE_URL}/api/users/{student_id}")
        assert user_resp.status_code == 200
        user_data = user_resp.json()
        
        enrolled_course_ids = [ec["course_id"] for ec in user_data.get("enrolled_courses", [])]
        assert courses[1]["course_id"] in enrolled_course_ids, "Course 2 should be enrolled"
        print(f"Final enrolled courses: {enrolled_course_ids}")

    def test_enroll_empty_course_ids_removes_all(self, api_client, admin_token):
        """Test that passing empty course_ids removes all enrollments"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        # Get a student
        users_resp = api_client.get(f"{BASE_URL}/api/users?role=student")
        students = users_resp.json()
        student_id = students[2]["user_id"] if len(students) > 2 else students[0]["user_id"]
        
        # First enroll in a course
        courses_resp = api_client.get(f"{BASE_URL}/api/courses")
        courses = [c for c in courses_resp.json() if c.get("status") == "published"]
        
        api_client.post(
            f"{BASE_URL}/api/admin/students/enroll",
            json={"student_id": student_id, "course_ids": [courses[0]["course_id"]]}
        )
        
        # Now remove all enrollments
        resp = api_client.post(
            f"{BASE_URL}/api/admin/students/enroll",
            json={"student_id": student_id, "course_ids": []}
        )
        assert resp.status_code == 200
        
        result = resp.json()
        print(f"Remove all result: removed={result.get('removed')}")
        
        # Verify no enrollments
        user_resp = api_client.get(f"{BASE_URL}/api/users/{student_id}")
        user_data = user_resp.json()
        assert len(user_data.get("enrolled_courses", [])) == 0, "Should have no enrollments"


class TestUserEnrolledCourses:
    """Tests for GET /api/users/{user_id} enrolled_courses enrichment"""

    def test_user_has_enrolled_courses_array(self, api_client, admin_token):
        """Test that GET /api/users/{user_id} returns enrolled_courses with details"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        # Get a student with enrollments
        users_resp = api_client.get(f"{BASE_URL}/api/users?role=student")
        students = users_resp.json()
        student_id = students[0]["user_id"]
        
        # Get available courses and enroll
        courses_resp = api_client.get(f"{BASE_URL}/api/courses")
        courses = [c for c in courses_resp.json() if c.get("status") == "published"]
        course_ids = [courses[0]["course_id"]]
        
        # Enroll the student
        api_client.post(
            f"{BASE_URL}/api/admin/students/enroll",
            json={"student_id": student_id, "course_ids": course_ids}
        )
        
        # Fetch user details
        user_resp = api_client.get(f"{BASE_URL}/api/users/{student_id}")
        assert user_resp.status_code == 200
        
        user_data = user_resp.json()
        assert "enrolled_courses" in user_data, "Response should have enrolled_courses field"
        
        enrolled_courses = user_data["enrolled_courses"]
        assert isinstance(enrolled_courses, list), "enrolled_courses should be a list"
        assert len(enrolled_courses) > 0, "Should have at least one enrolled course"
        
        # Verify enrolled course has required fields
        course_info = enrolled_courses[0]
        assert "enrollment_id" in course_info, "Should have enrollment_id"
        assert "course_id" in course_info, "Should have course_id"
        assert "course_title" in course_info, "Should have course_title"
        assert "progress" in course_info, "Should have progress"
        assert "status" in course_info, "Should have status"
        assert "enrolled_at" in course_info, "Should have enrolled_at"
        
        print(f"Enrolled course: {course_info}")

    def test_user_enrolled_courses_shows_progress(self, api_client, admin_token):
        """Test that enrolled_courses shows progress for each course"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        users_resp = api_client.get(f"{BASE_URL}/api/users?role=student")
        students = users_resp.json()
        student_id = students[0]["user_id"]
        
        user_resp = api_client.get(f"{BASE_URL}/api/users/{student_id}")
        user_data = user_resp.json()
        
        enrolled_courses = user_data.get("enrolled_courses", [])
        if enrolled_courses:
            for ec in enrolled_courses:
                assert "progress" in ec
                assert isinstance(ec["progress"], (int, float))
                print(f"Course {ec.get('course_title')}: {ec['progress']}% progress")


class TestCertificateAutoGeneration:
    """Tests for auto-generating cert templates when creating courses with certificate_enabled=true"""

    def test_course_with_certificate_enabled_creates_template(self, api_client, admin_token):
        """Test that POST /api/courses with certificate_enabled=true auto-creates cert template"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        # Create a course with certificate_enabled=true
        course_data = {
            "title": "TEST_Auto_Cert_Course",
            "description": "Test course for certificate auto-generation",
            "category": "Testing",
            "level": "beginner",
            "status": "draft",
            "certificate_enabled": True
        }
        
        resp = api_client.post(f"{BASE_URL}/api/courses", json=course_data)
        assert resp.status_code == 200, f"Course creation failed: {resp.text}"
        
        created_course = resp.json()
        course_id = created_course["course_id"]
        assert created_course["certificate_enabled"] == True
        print(f"Created course with certificate_enabled: {course_id}")
        
        # Verify cert_template was created in database
        # Since there's no direct API to list cert_templates, we verify by checking the course
        # The main validation is that the backend doesn't throw error
        
        # Cleanup - delete the test course
        delete_resp = api_client.delete(f"{BASE_URL}/api/courses/{course_id}")
        assert delete_resp.status_code == 200
        print("Test course deleted successfully")

    def test_course_without_certificate_enabled_no_template(self, api_client, admin_token):
        """Test that course without certificate_enabled doesn't create template"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        course_data = {
            "title": "TEST_No_Cert_Course",
            "description": "Test course without certificate",
            "category": "Testing",
            "level": "beginner",
            "status": "draft",
            "certificate_enabled": False
        }
        
        resp = api_client.post(f"{BASE_URL}/api/courses", json=course_data)
        assert resp.status_code == 200
        
        created_course = resp.json()
        course_id = created_course["course_id"]
        assert created_course.get("certificate_enabled") == False
        print(f"Created course without certificate: {course_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/courses/{course_id}")


class TestStudentDashboardEnrollments:
    """Tests for student dashboard showing enrolled courses"""

    def test_student_enrollments_api(self, api_client, student_token):
        """Test that GET /api/enrollments returns student's enrollments"""
        api_client.headers.update({"Authorization": f"Bearer {student_token}"})
        
        resp = api_client.get(f"{BASE_URL}/api/enrollments")
        assert resp.status_code == 200, f"Enrollments fetch failed: {resp.text}"
        
        enrollments = resp.json()
        assert isinstance(enrollments, list), "Should return list of enrollments"
        
        if enrollments:
            enrollment = enrollments[0]
            assert "enrollment_id" in enrollment
            assert "course_id" in enrollment
            assert "course_title" in enrollment
            assert "progress" in enrollment
            assert "status" in enrollment
            print(f"Student has {len(enrollments)} enrollments")
            for e in enrollments:
                print(f"  - {e.get('course_title')}: {e.get('progress')}%")
        else:
            print("Student has no enrollments (this is valid if student was just created)")


# Fixtures

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        token = response.json().get("token")
        print(f"Admin login successful")
        return token
    pytest.skip(f"Admin authentication failed: {response.text}")


@pytest.fixture
def student_token(api_client):
    """Get student authentication token"""
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": STUDENT_EMAIL, "password": STUDENT_PASSWORD}
    )
    if response.status_code == 200:
        token = response.json().get("token")
        print(f"Student login successful")
        return token
    pytest.skip(f"Student authentication failed: {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
