import requests
import sys
from datetime import datetime, timezone
import json

class LMSBackendTester:
    def __init__(self, base_url="https://cert-auto-gen.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.instructor_token = None
        self.student_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
    def log_result(self, test_name, success, message="", expected_status=None, actual_status=None):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if message:
            print(f"    {message}")
        if not success:
            self.failed_tests.append({
                "test": test_name,
                "message": message,
                "expected_status": expected_status,
                "actual_status": actual_status
            })
        else:
            self.tests_passed += 1
    
    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make API request and return response"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return None, f"Unsupported method: {method}"
                
            return response, None
        except requests.exceptions.RequestException as e:
            return None, f"Request failed: {str(e)}"
    
    def test_health_check(self):
        """Test API health endpoint"""
        print("\n🔍 Testing API Health...")
        response, error = self.make_request('GET', 'api/health')
        
        if error:
            self.log_result("Health Check", False, error)
            return False
            
        success = response.status_code == 200
        self.log_result("Health Check", success, 
                       f"Status: {response.status_code}, Response: {response.text[:100]}")
        return success
    
    def test_seed_data(self):
        """Test seeding database"""
        print("\n🔍 Testing Database Seeding...")
        response, error = self.make_request('POST', 'api/seed')
        
        if error:
            self.log_result("Database Seed", False, error)
            return False
            
        success = response.status_code == 200
        if success:
            try:
                data = response.json()
                stats = data.get('stats', {})
                message = f"Users: {stats.get('users', 0)}, Courses: {stats.get('courses', 0)}, " + \
                         f"Lessons: {stats.get('lessons', 0)}, Enrollments: {stats.get('enrollments', 0)}"
                self.log_result("Database Seed", True, message)
            except:
                self.log_result("Database Seed", True, f"Status: {response.status_code}")
        else:
            self.log_result("Database Seed", False, f"Status: {response.status_code}")
            
        return success
    
    def test_login(self, email, password, role_name):
        """Test login functionality"""
        print(f"\n🔍 Testing {role_name} Login...")
        response, error = self.make_request('POST', 'api/auth/login', 
                                          {"email": email, "password": password})
        
        if error:
            self.log_result(f"{role_name} Login", False, error)
            return None
            
        if response.status_code == 200:
            try:
                data = response.json()
                token = data.get('token')
                user = data.get('user')
                if token and user:
                    self.log_result(f"{role_name} Login", True, 
                                   f"User: {user.get('name', 'Unknown')}, Role: {user.get('role', 'Unknown')}")
                    return token
                else:
                    self.log_result(f"{role_name} Login", False, "Missing token or user in response")
                    return None
            except:
                self.log_result(f"{role_name} Login", False, "Invalid JSON response")
                return None
        else:
            self.log_result(f"{role_name} Login", False, f"Status: {response.status_code}")
            return None
    
    def test_auth_me(self, token, expected_role):
        """Test auth/me endpoint"""
        print(f"\n🔍 Testing Auth Me for {expected_role}...")
        response, error = self.make_request('GET', 'api/auth/me', token=token)
        
        if error:
            self.log_result(f"Auth Me ({expected_role})", False, error)
            return False
            
        if response.status_code == 200:
            try:
                user = response.json()
                actual_role = user.get('role')
                success = actual_role == expected_role
                message = f"Role: {actual_role}, Name: {user.get('name', 'Unknown')}"
                self.log_result(f"Auth Me ({expected_role})", success, message)
                return success
            except:
                self.log_result(f"Auth Me ({expected_role})", False, "Invalid JSON response")
                return False
        else:
            self.log_result(f"Auth Me ({expected_role})", False, f"Status: {response.status_code}")
            return False
    
    def test_users_endpoints(self):
        """Test user management endpoints"""
        print("\n🔍 Testing User Management Endpoints...")
        
        # Test getting all users (admin only)
        response, error = self.make_request('GET', 'api/users', token=self.admin_token)
        if error:
            self.log_result("Get All Users", False, error)
        else:
            success = response.status_code == 200
            if success:
                try:
                    users = response.json()
                    self.log_result("Get All Users", True, f"Retrieved {len(users)} users")
                except:
                    self.log_result("Get All Users", False, "Invalid JSON response")
            else:
                self.log_result("Get All Users", False, f"Status: {response.status_code}")
        
        # Test filtering users by role
        response, error = self.make_request('GET', 'api/users?role=student', token=self.admin_token)
        if error:
            self.log_result("Filter Students", False, error)
        else:
            success = response.status_code == 200
            if success:
                try:
                    students = response.json()
                    self.log_result("Filter Students", True, f"Found {len(students)} students")
                except:
                    self.log_result("Filter Students", False, "Invalid JSON response")
            else:
                self.log_result("Filter Students", False, f"Status: {response.status_code}")
    
    def test_courses_endpoints(self):
        """Test course management endpoints"""
        print("\n🔍 Testing Course Management Endpoints...")
        
        # Test getting all courses
        response, error = self.make_request('GET', 'api/courses')
        if error:
            self.log_result("Get All Courses", False, error)
            return
            
        success = response.status_code == 200
        if success:
            try:
                courses = response.json()
                self.log_result("Get All Courses", True, f"Retrieved {len(courses)} courses")
                
                # Test getting specific course details
                if courses:
                    course_id = courses[0]['course_id']
                    response, error = self.make_request('GET', f'api/courses/{course_id}')
                    if error:
                        self.log_result("Get Course Details", False, error)
                    else:
                        success = response.status_code == 200
                        if success:
                            try:
                                course = response.json()
                                modules = course.get('modules', [])
                                self.log_result("Get Course Details", True, 
                                               f"Course: {course.get('title', 'Unknown')}, Modules: {len(modules)}")
                            except:
                                self.log_result("Get Course Details", False, "Invalid JSON response")
                        else:
                            self.log_result("Get Course Details", False, f"Status: {response.status_code}")
                            
            except:
                self.log_result("Get All Courses", False, "Invalid JSON response")
        else:
            self.log_result("Get All Courses", False, f"Status: {response.status_code}")
    
    def test_enrollments_endpoints(self):
        """Test enrollment endpoints"""
        print("\n🔍 Testing Enrollment Endpoints...")
        
        # Test getting enrollments
        response, error = self.make_request('GET', 'api/enrollments', token=self.student_token)
        if error:
            self.log_result("Get Student Enrollments", False, error)
        else:
            success = response.status_code == 200
            if success:
                try:
                    enrollments = response.json()
                    self.log_result("Get Student Enrollments", True, 
                                   f"Student has {len(enrollments)} enrollments")
                except:
                    self.log_result("Get Student Enrollments", False, "Invalid JSON response")
            else:
                self.log_result("Get Student Enrollments", False, f"Status: {response.status_code}")
        
        # Test admin getting all enrollments
        response, error = self.make_request('GET', 'api/enrollments', token=self.admin_token)
        if error:
            self.log_result("Get All Enrollments (Admin)", False, error)
        else:
            success = response.status_code == 200
            if success:
                try:
                    enrollments = response.json()
                    self.log_result("Get All Enrollments (Admin)", True, 
                                   f"Total {len(enrollments)} enrollments")
                except:
                    self.log_result("Get All Enrollments (Admin)", False, "Invalid JSON response")
            else:
                self.log_result("Get All Enrollments (Admin)", False, f"Status: {response.status_code}")
    
    def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        print("\n🔍 Testing Analytics Endpoints...")
        
        # Test overview analytics
        response, error = self.make_request('GET', 'api/analytics/overview', token=self.admin_token)
        if error:
            self.log_result("Analytics Overview", False, error)
        else:
            success = response.status_code == 200
            if success:
                try:
                    data = response.json()
                    students = data.get('total_students', 0)
                    courses = data.get('total_courses', 0)
                    completion_rate = data.get('completion_rate', 0)
                    self.log_result("Analytics Overview", True, 
                                   f"Students: {students}, Courses: {courses}, Completion: {completion_rate}%")
                except:
                    self.log_result("Analytics Overview", False, "Invalid JSON response")
            else:
                self.log_result("Analytics Overview", False, f"Status: {response.status_code}")
    
    def test_notifications_endpoints(self):
        """Test notifications endpoints"""
        print("\n🔍 Testing Notifications Endpoints...")
        
        # Test getting notifications
        response, error = self.make_request('GET', 'api/notifications', token=self.student_token)
        if error:
            self.log_result("Get Notifications", False, error)
        else:
            success = response.status_code == 200
            if success:
                try:
                    notifications = response.json()
                    self.log_result("Get Notifications", True, 
                                   f"Retrieved {len(notifications)} notifications")
                except:
                    self.log_result("Get Notifications", False, "Invalid JSON response")
            else:
                self.log_result("Get Notifications", False, f"Status: {response.status_code}")
    
    def test_quizzes_endpoints(self):
        """Test quiz endpoints"""
        print("\n🔍 Testing Quiz Endpoints...")
        
        # Test getting quizzes
        response, error = self.make_request('GET', 'api/quizzes', token=self.instructor_token)
        if error:
            self.log_result("Get Quizzes", False, error)
        else:
            success = response.status_code == 200
            if success:
                try:
                    quizzes = response.json()
                    self.log_result("Get Quizzes", True, f"Retrieved {len(quizzes)} quizzes")
                except:
                    self.log_result("Get Quizzes", False, "Invalid JSON response")
            else:
                self.log_result("Get Quizzes", False, f"Status: {response.status_code}")
    
    def test_assignments_endpoints(self):
        """Test assignment endpoints"""
        print("\n🔍 Testing Assignment Endpoints...")
        
        # Test getting assignments
        response, error = self.make_request('GET', 'api/assignments', token=self.instructor_token)
        if error:
            self.log_result("Get Assignments", False, error)
        else:
            success = response.status_code == 200
            if success:
                try:
                    assignments = response.json()
                    self.log_result("Get Assignments", True, f"Retrieved {len(assignments)} assignments")
                except:
                    self.log_result("Get Assignments", False, "Invalid JSON response")
            else:
                self.log_result("Get Assignments", False, f"Status: {response.status_code}")
    
    def test_certificates_endpoints(self):
        """Test certificate endpoints"""
        print("\n🔍 Testing Certificate Endpoints...")
        
        # Test getting certificates
        response, error = self.make_request('GET', 'api/certificates', token=self.student_token)
        if error:
            self.log_result("Get Certificates", False, error)
        else:
            success = response.status_code == 200
            if success:
                try:
                    certificates = response.json()
                    self.log_result("Get Certificates", True, 
                                   f"Retrieved {len(certificates)} certificates")
                except:
                    self.log_result("Get Certificates", False, "Invalid JSON response")
            else:
                self.log_result("Get Certificates", False, f"Status: {response.status_code}")
        
        # Test certificate eligibility check
        response, error = self.make_request('GET', 'api/courses', token=self.student_token)
        if not error and response.status_code == 200:
            try:
                courses = response.json()
                if courses:
                    course_id = courses[0]['course_id']
                    response, error = self.make_request('GET', f'api/certificates/check/{course_id}', token=self.student_token)
                    if error:
                        self.log_result("Certificate Check", False, error)
                    else:
                        success = response.status_code == 200
                        if success:
                            try:
                                cert_data = response.json()
                                eligible = cert_data.get('eligible', False)
                                self.log_result("Certificate Check", True, 
                                               f"Eligible: {eligible}, Lessons: {cert_data.get('lessons_completed', 0)}/{cert_data.get('total_lessons', 0)}")
                            except:
                                self.log_result("Certificate Check", False, "Invalid JSON response")
                        else:
                            self.log_result("Certificate Check", False, f"Status: {response.status_code}")
            except:
                pass

    def test_user_management_extended(self):
        """Test extended user management features"""
        print("\n🔍 Testing Extended User Management...")
        
        # Test creating user with extended fields
        user_data = {
            "email": f"test_student_{datetime.now().strftime('%H%M%S')}@kidsintech.school",
            "first_name": "Test",
            "last_name": "Student", 
            "role": "student",
            "dob": "2010-01-15",
            "gender": "male",
            "phone": "+1234567890",
            "school_name": "Test Elementary",
            "class_name": "5th Grade",
            "guardian_name": "John Smith"
        }
        
        response, error = self.make_request('POST', 'api/users', data=user_data, token=self.admin_token)
        if error:
            self.log_result("Create User with Extended Fields", False, error)
            return None
        else:
            success = response.status_code == 200
            if success:
                try:
                    created_user = response.json()
                    user_id = created_user.get('user_id')
                    self.log_result("Create User with Extended Fields", True, 
                                   f"User ID: {user_id}, School: {created_user.get('school_name')}")
                    
                    # Test suspend user
                    response, error = self.make_request('PUT', f'api/users/{user_id}/suspend', token=self.admin_token)
                    if error:
                        self.log_result("Suspend User", False, error)
                    else:
                        success = response.status_code == 200
                        self.log_result("Suspend User", success, f"Status: {response.status_code}")
                    
                    # Test reactivate user  
                    response, error = self.make_request('PUT', f'api/users/{user_id}/reactivate', token=self.admin_token)
                    if error:
                        self.log_result("Reactivate User", False, error)
                    else:
                        success = response.status_code == 200
                        self.log_result("Reactivate User", success, f"Status: {response.status_code}")
                    
                    return user_id
                    
                except:
                    self.log_result("Create User with Extended Fields", False, "Invalid JSON response")
                    return None
            else:
                self.log_result("Create User with Extended Fields", False, f"Status: {response.status_code}")
                return None
    
    def test_announcements_endpoints(self):
        """Test announcements endpoints"""
        print("\n🔍 Testing Announcements Endpoints...")
        
        # Test creating announcement
        announcement_data = {
            "title": "Test Announcement",
            "message": "This is a test announcement for all students",
            "target": "all",
            "priority": "normal"
        }
        
        response, error = self.make_request('POST', 'api/announcements', data=announcement_data, token=self.admin_token)
        if error:
            self.log_result("Create Announcement", False, error)
        else:
            success = response.status_code == 200
            if success:
                try:
                    announcement = response.json()
                    announcement_id = announcement.get('announcement_id')
                    self.log_result("Create Announcement", True, f"ID: {announcement_id}")
                except:
                    self.log_result("Create Announcement", False, "Invalid JSON response")
            else:
                self.log_result("Create Announcement", False, f"Status: {response.status_code}")
        
        # Test getting announcements
        response, error = self.make_request('GET', 'api/announcements', token=self.student_token)
        if error:
            self.log_result("Get Announcements", False, error)
        else:
            success = response.status_code == 200
            if success:
                try:
                    announcements = response.json()
                    self.log_result("Get Announcements", True, f"Retrieved {len(announcements)} announcements")
                except:
                    self.log_result("Get Announcements", False, "Invalid JSON response")
            else:
                self.log_result("Get Announcements", False, f"Status: {response.status_code}")
    
    def test_profile_and_password_endpoints(self):
        """Test profile update and password change endpoints"""
        print("\n🔍 Testing Profile & Password Endpoints...")
        
        # Test profile update
        profile_data = {
            "name": "Liam Updated Johnson",
            "bio": "Updated bio for testing",
            "phone": "+1987654321"
        }
        
        response, error = self.make_request('PUT', 'api/auth/profile', data=profile_data, token=self.student_token)
        if error:
            self.log_result("Update Profile", False, error)
        else:
            success = response.status_code == 200
            if success:
                try:
                    updated_user = response.json()
                    self.log_result("Update Profile", True, f"Name: {updated_user.get('name')}")
                except:
                    self.log_result("Update Profile", False, "Invalid JSON response")
            else:
                self.log_result("Update Profile", False, f"Status: {response.status_code}")
        
        # Test password change
        password_data = {
            "current_password": "student123",
            "new_password": "newpassword123"
        }
        
        response, error = self.make_request('POST', 'api/auth/change-password', data=password_data, token=self.student_token)
        if error:
            self.log_result("Change Password", False, error)
        else:
            success = response.status_code == 200
            self.log_result("Change Password", success, f"Status: {response.status_code}")
            
            # Change it back for other tests
            if success:
                revert_data = {
                    "current_password": "newpassword123", 
                    "new_password": "student123"
                }
                self.make_request('POST', 'api/auth/change-password', data=revert_data, token=self.student_token)
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("🚀 KIDS IN TECH LMS - BACKEND API TESTING")
        print("=" * 60)
        
        # Test basic connectivity
        if not self.test_health_check():
            print("\n❌ Health check failed - stopping tests")
            return False
        
        # Seed database
        self.test_seed_data()
        
        # Test authentication
        self.admin_token = self.test_login("admin@kidsintech.school", "innovate@2025", "Admin")
        self.instructor_token = self.test_login("sarah@kidsintech.school", "instructor123", "Instructor")
        self.student_token = self.test_login("liam@student.kidsintech.school", "student123", "Student")
        
        if not all([self.admin_token, self.instructor_token, self.student_token]):
            print("\n❌ Authentication failed - stopping tests")
            return False
        
        # Test auth/me for each role
        self.test_auth_me(self.admin_token, "super_admin")
        self.test_auth_me(self.instructor_token, "instructor")
        self.test_auth_me(self.student_token, "student")
        
        # Test various endpoints
        self.test_users_endpoints()
        self.test_courses_endpoints()
        self.test_enrollments_endpoints()
        self.test_analytics_endpoints()
        self.test_notifications_endpoints()
        self.test_quizzes_endpoints()
        self.test_assignments_endpoints()
        self.test_certificates_endpoints()
        
        # Test new extended features
        self.test_user_management_extended()
        self.test_announcements_endpoints()
        self.test_profile_and_password_endpoints()
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                print(f"  • {failure['test']}: {failure['message']}")
        
        print("=" * 60)

def main():
    tester = LMSBackendTester()
    
    try:
        tester.run_all_tests()
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
    finally:
        tester.print_summary()
    
    return 0 if len(tester.failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())