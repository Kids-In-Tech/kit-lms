import React, { createContext, useContext, useState, useCallback } from 'react';

const translations = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.courses': 'Courses',
    'nav.students': 'Students',
    'nav.instructors': 'Instructors',
    'nav.quizzes': 'Quizzes',
    'nav.assignments': 'Assignments',
    'nav.analytics': 'Analytics',
    'nav.certificates': 'Certificates',
    'nav.notifications': 'Notifications',
    'nav.settings': 'Settings',
    'nav.profile': 'Profile',
    'nav.myCourses': 'My Courses',
    'nav.logOut': 'Log Out',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': "Welcome back! Here's your platform overview.",
    'dashboard.totalStudents': 'Total Students',
    'dashboard.totalInstructors': 'Total Instructors',
    'dashboard.totalCourses': 'Total Courses',
    'dashboard.activeEnrollments': 'Active Enrollments',
    'dashboard.completionRate': 'Completion Rate',
    'dashboard.avgProgress': 'Avg Progress',
    'dashboard.pendingReviews': 'Pending Reviews',
    'dashboard.certificates': 'Certificates',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.enrollmentStatus': 'Enrollment Status',
    'dashboard.recentSignups': 'Recent Signups',

    // Student Dashboard
    'student.myCourses': 'My Courses',
    'student.activeCourses': 'Active Courses',
    'student.completedCourses': 'Completed Courses',
    'student.updatedCourses': 'Newly Updated',
    'student.noCourses': "You're not enrolled in any courses yet.",
    'student.noActive': 'No active courses.',
    'student.noCompleted': 'No completed courses yet.',
    'student.noUpdated': 'No recently updated courses.',
    'student.progress': 'Progress',
    'student.continueLearning': 'Continue Learning',
    'student.reviewCourse': 'Review Course',
    'student.lessons': 'lessons',
    'student.completed': 'Completed',

    // Courses
    'courses.title': 'Courses',
    'courses.newCourse': 'New Course',
    'courses.search': 'Search courses...',
    'courses.manage': 'Manage',
    'courses.editCourse': 'Edit Course',
    'courses.createCourse': 'Create Course',
    'courses.saveCourse': 'Save Course',
    'courses.deleteCourse': 'Delete Course',
    'courses.modules': 'modules',
    'courses.enrolled': 'enrolled',
    'courses.addModule': '+ Add Module',
    'courses.addLesson': '+ Add Lesson',
    'courses.courseBuilder': 'Course Builder',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.confirm': 'Confirm',
    'common.loading': 'Loading...',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.noData': 'No data available',
    'common.name': 'Name',
    'common.email': 'Email',
    'common.role': 'Role',
    'common.joined': 'Joined',
    'common.status': 'Status',
    'common.active': 'Active',
    'common.title': 'Title',
    'common.description': 'Description',
    'common.category': 'Category',
    'common.level': 'Level',

    // Notifications
    'notif.title': 'Notifications',
    'notif.noNotifications': 'No notifications',
    'notif.markRead': 'Mark read',

    // Header
    'header.search': 'Search anything...',
    'header.language': 'Language',

    // Lesson
    'lesson.markComplete': 'Mark as Complete',
    'lesson.completed': 'Completed',
    'lesson.nextLesson': 'Next Lesson',
    'lesson.locked': 'Complete this lesson to continue',
    'lesson.selectLesson': 'Select a lesson to start learning',
    'lesson.editContent': 'Edit Lesson Content',
    'lesson.saveLessonContent': 'Save Lesson',
    'lesson.content': 'Content',

    // Modal
    'modal.confirmDelete': 'Are you sure?',

    // Settings
    'settings.language': 'Language Preference',
    'settings.english': 'English',
    'settings.hausa': 'Hausa',
  },
  ha: {
    // Navigation
    'nav.dashboard': 'Babban Shafi',
    'nav.courses': 'Darussa',
    'nav.students': 'Dalibai',
    'nav.instructors': 'Malamai',
    'nav.quizzes': 'Jarrabawa',
    'nav.assignments': 'Ayyuka',
    'nav.analytics': 'Nazari',
    'nav.certificates': 'Takaddun Shaida',
    'nav.notifications': 'Sanarwa',
    'nav.settings': 'Saituna',
    'nav.profile': 'Bayanan Kai',
    'nav.myCourses': 'Darussaina',
    'nav.logOut': 'Fita',

    // Dashboard
    'dashboard.title': 'Babban Shafi',
    'dashboard.welcome': 'Barka da dawowar! Ga taƙaitaccen bayanin dandamali.',
    'dashboard.totalStudents': 'Jimillar Dalibai',
    'dashboard.totalInstructors': 'Jimillar Malamai',
    'dashboard.totalCourses': 'Jimillar Darussa',
    'dashboard.activeEnrollments': 'Rajista Masu Aiki',
    'dashboard.completionRate': 'Adadin Kammala',
    'dashboard.avgProgress': 'Matsakaicin Ci gaba',
    'dashboard.pendingReviews': 'Nazarin da ke Jira',
    'dashboard.certificates': 'Takaddun Shaida',
    'dashboard.recentActivity': 'Ayyukan Kwanan nan',
    'dashboard.enrollmentStatus': 'Yanayin Rajista',
    'dashboard.recentSignups': 'Sabuwar Rajista',

    // Student Dashboard
    'student.myCourses': 'Darussaina',
    'student.activeCourses': 'Darussa Masu Aiki',
    'student.completedCourses': 'Darussa da aka Kammala',
    'student.updatedCourses': 'Sabbin Sabuntawa',
    'student.noCourses': 'Ba a yi maka rajista a kowane darasi ba tukuna.',
    'student.noActive': 'Babu darussa masu aiki.',
    'student.noCompleted': 'Ba a kammala kowane darasi ba tukuna.',
    'student.noUpdated': 'Babu darussa da aka sabunta kwanan nan.',
    'student.progress': 'Ci gaba',
    'student.continueLearning': 'Ci gaba da Koyo',
    'student.reviewCourse': 'Sake Duba Darasi',
    'student.lessons': 'darussa',
    'student.completed': 'An Kammala',

    // Courses
    'courses.title': 'Darussa',
    'courses.newCourse': 'Sabon Darasi',
    'courses.search': 'Nemo darussa...',
    'courses.manage': 'Sarrafa',
    'courses.editCourse': 'Gyara Darasi',
    'courses.createCourse': 'Ƙirƙiri Darasi',
    'courses.saveCourse': 'Ajiye Darasi',
    'courses.deleteCourse': 'Share Darasi',
    'courses.modules': 'sashe',
    'courses.enrolled': 'an yi rajista',
    'courses.addModule': '+ Ƙara Sashe',
    'courses.addLesson': '+ Ƙara Darasi',
    'courses.courseBuilder': 'Gina Darasi',

    // Common
    'common.save': 'Ajiye',
    'common.cancel': 'Soke',
    'common.delete': 'Share',
    'common.edit': 'Gyara',
    'common.search': 'Bincika',
    'common.confirm': 'Tabbatar',
    'common.loading': 'Ana lodi...',
    'common.back': 'Baya',
    'common.next': 'Gaba',
    'common.noData': 'Babu bayanan da ake samu',
    'common.name': 'Suna',
    'common.email': 'Imel',
    'common.role': 'Matsayi',
    'common.joined': 'Ranar Shiga',
    'common.status': 'Yanayi',
    'common.active': 'Mai Aiki',
    'common.title': 'Take',
    'common.description': 'Bayani',
    'common.category': 'Rukuni',
    'common.level': 'Matsayi',

    // Notifications
    'notif.title': 'Sanarwa',
    'notif.noNotifications': 'Babu sanarwa',
    'notif.markRead': 'Yi alama an karanta',

    // Header
    'header.search': 'Nemo komai...',
    'header.language': 'Harshe',

    // Lesson
    'lesson.markComplete': 'Yi alama an kammala',
    'lesson.completed': 'An Kammala',
    'lesson.nextLesson': 'Darasi na Gaba',
    'lesson.locked': 'Kammala wannan darasi don ci gaba',
    'lesson.selectLesson': 'Zaɓi darasi don fara koyo',
    'lesson.editContent': 'Gyara Abubuwan Darasi',
    'lesson.saveLessonContent': 'Ajiye Darasi',
    'lesson.content': 'Abun ciki',

    // Modal
    'modal.confirmDelete': 'Ka tabbata?',

    // Settings
    'settings.language': 'Zaɓin Harshe',
    'settings.english': 'Turanci',
    'settings.hausa': 'Hausa',
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('kit_language') || 'en');

  const switchLanguage = useCallback((lang) => {
    setLanguage(lang);
    localStorage.setItem('kit_language', lang);
  }, []);

  const t = useCallback((key) => {
    return translations[language]?.[key] || translations.en?.[key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
