// ─── Translation dictionary ───────────────────────────────────────
// Flat key-value pairs organized by namespace.key.
// Add new locales by creating a Record<TranslationKey, string> for
// the new language code.

export const LOCALES = ["en", "es", "fr", "pt-BR"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export type TranslationKey =
  // Global / nav
  | "nav.dashboard"
  | "nav.courses"
  | "nav.myLearning"
  | "nav.analytics"
  | "nav.achievements"
  | "nav.settings"
  | "nav.admin"
  | "nav.signOut"
  | "nav.theme"
  | "nav.language"
  // Dashboard
  | "dashboard.welcome"
  | "dashboard.activeCourses"
  | "dashboard.lessonsAvailable"
  | "dashboard.organizations"
  | "dashboard.role"
  | "dashboard.myCourses"
  | "dashboard.continue"
  | "dashboard.noEnrollments"
  | "dashboard.browseCatalog"
  | "dashboard.currentStreak"
  | "dashboard.streakDays"
  | "dashboard.longest"
  | "dashboard.achievements"
  | "dashboard.achievementsEarned"
  | "dashboard.recommended"
  | "dashboard.keepLearning"
  // Analytics (student)
  | "analytics.title"
  | "analytics.description"
  | "analytics.inProgress"
  | "analytics.completed"
  | "analytics.lessonsDone"
  | "analytics.streak"
  | "analytics.weeklyActivity"
  | "analytics.quizPerformance"
  | "analytics.avgScore"
  | "analytics.quizzesPassed"
  | "analytics.learningStats"
  | "analytics.totalNotes"
  | "analytics.totalBookmarks"
  | "analytics.totalWatchTime"
  | "analytics.courseBreakdown"
  | "analytics.completionRate"
  // Analytics (instructor)
  | "analyticsIns.title"
  | "analyticsIns.description"
  | "analyticsIns.totalStudents"
  | "analyticsIns.activeStudents"
  | "analyticsIns.completionRate"
  | "analyticsIns.avgRating"
  | "analyticsIns.enrollmentTrend"
  | "analyticsIns.coursePerformance"
  | "analyticsIns.studentEngagement"
  | "analyticsIns.notesPerStudent"
  | "analyticsIns.quizAttempts"
  | "analyticsIns.quizPassRate"
  | "analyticsIns.recentStudents"
  // Admin
  | "admin.tenants"
  | "admin.users"
  | "admin.auditLog"
  | "admin.export"
  | "admin.suspend"
  | "admin.unsuspend"
  | "admin.active"
  | "admin.suspended"
  // Settings
  | "settings.title"
  | "settings.profile"
  | "settings.notifications"
  // Common
  | "common.loading"
  | "common.error"
  | "common.save"
  | "common.cancel"
  | "common.delete"
  | "common.search"
  | "common.noData"
  | "common.back"
  | "common.viewAll"
  | "common.days"
  | "common.weeks";

const en: Record<TranslationKey, string> = {
  // Global / nav
  "nav.dashboard": "Dashboard",
  "nav.courses": "Courses",
  "nav.myLearning": "My Learning",
  "nav.analytics": "Analytics",
  "nav.achievements": "Achievements",
  "nav.settings": "Settings",
  "nav.admin": "Admin",
  "nav.signOut": "Sign out",
  "nav.theme": "Theme",
  "nav.language": "Language",
  // Dashboard
  "dashboard.welcome": "Welcome back",
  "dashboard.activeCourses": "Active courses",
  "dashboard.lessonsAvailable": "Lessons available",
  "dashboard.organizations": "Organizations",
  "dashboard.role": "Role",
  "dashboard.myCourses": "My courses",
  "dashboard.continue": "Continue",
  "dashboard.noEnrollments": "No enrollments yet.",
  "dashboard.browseCatalog": "Browse the catalog",
  "dashboard.currentStreak": "Current Streak",
  "dashboard.streakDays": "days",
  "dashboard.longest": "Longest",
  "dashboard.achievements": "Achievements",
  "dashboard.achievementsEarned": "earned",
  "dashboard.recommended": "Recommended for you",
  "dashboard.keepLearning": "Keep learning",
  // Analytics (student)
  "analytics.title": "Your Analytics",
  "analytics.description": "Track your learning journey — progress, streaks, quiz performance, and more.",
  "analytics.inProgress": "In progress",
  "analytics.completed": "Completed",
  "analytics.lessonsDone": "Lessons done",
  "analytics.streak": "Day streak",
  "analytics.weeklyActivity": "Weekly Activity",
  "analytics.quizPerformance": "Quiz Performance",
  "analytics.avgScore": "Average score",
  "analytics.quizzesPassed": "Quizzes passed",
  "analytics.learningStats": "Learning Stats",
  "analytics.totalNotes": "Total notes",
  "analytics.totalBookmarks": "Total bookmarks",
  "analytics.totalWatchTime": "Watch time",
  "analytics.courseBreakdown": "Course Breakdown",
  "analytics.completionRate": "Completion rate",
  // Analytics (instructor)
  "analyticsIns.title": "Course Analytics",
  "analyticsIns.description": "Monitor student progress, engagement, and course performance across your tenant.",
  "analyticsIns.totalStudents": "Total students",
  "analyticsIns.activeStudents": "Active students",
  "analyticsIns.completionRate": "Completion rate",
  "analyticsIns.avgRating": "Avg rating",
  "analyticsIns.enrollmentTrend": "Enrollment Trend",
  "analyticsIns.coursePerformance": "Course Performance",
  "analyticsIns.studentEngagement": "Student Engagement",
  "analyticsIns.notesPerStudent": "Notes per student",
  "analyticsIns.quizAttempts": "Quiz attempts",
  "analyticsIns.quizPassRate": "Quiz pass rate",
  "analyticsIns.recentStudents": "Recent Students",
  // Admin
  "admin.tenants": "Tenants",
  "admin.users": "Users",
  "admin.auditLog": "Audit Log",
  "admin.export": "Export",
  "admin.suspend": "Suspend",
  "admin.unsuspend": "Unsuspend",
  "admin.active": "Active",
  "admin.suspended": "Suspended",
  // Settings
  "settings.title": "Settings",
  "settings.profile": "Profile",
  "settings.notifications": "Notifications",
  // Common
  "common.loading": "Loading...",
  "common.error": "An error occurred",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.search": "Search",
  "common.noData": "No data available",
  "common.back": "Back",
  "common.viewAll": "View all",
  "common.days": "days",
  "common.weeks": "weeks",
};

const es: Record<TranslationKey, string> = {
  "nav.dashboard": "Panel",
  "nav.courses": "Cursos",
  "nav.myLearning": "Mi Aprendizaje",
  "nav.analytics": "Analíticas",
  "nav.achievements": "Logros",
  "nav.settings": "Configuración",
  "nav.admin": "Admin",
  "nav.signOut": "Cerrar sesión",
  "nav.theme": "Tema",
  "nav.language": "Idioma",
  "dashboard.welcome": "Bienvenido de nuevo",
  "dashboard.activeCourses": "Cursos activos",
  "dashboard.lessonsAvailable": "Lecciones disponibles",
  "dashboard.organizations": "Organizaciones",
  "dashboard.role": "Rol",
  "dashboard.myCourses": "Mis cursos",
  "dashboard.continue": "Continuar",
  "dashboard.noEnrollments": "No hay inscripciones aún.",
  "dashboard.browseCatalog": "Explorar el catálogo",
  "dashboard.currentStreak": "Racha actual",
  "dashboard.streakDays": "días",
  "dashboard.longest": "Más larga",
  "dashboard.achievements": "Logros",
  "dashboard.achievementsEarned": "obtenidos",
  "dashboard.recommended": "Recomendados para ti",
  "dashboard.keepLearning": "Sigue aprendiendo",
  "analytics.title": "Tus Analíticas",
  "analytics.description": "Sigue tu progreso de aprendizaje — rachas, resultados de quizzes y más.",
  "analytics.inProgress": "En progreso",
  "analytics.completed": "Completados",
  "analytics.lessonsDone": "Lecciones hechas",
  "analytics.streak": "Racha de días",
  "analytics.weeklyActivity": "Actividad Semanal",
  "analytics.quizPerformance": "Rendimiento en Quizzes",
  "analytics.avgScore": "Puntaje promedio",
  "analytics.quizzesPassed": "Quizzes aprobados",
  "analytics.learningStats": "Estadísticas de Aprendizaje",
  "analytics.totalNotes": "Notas totales",
  "analytics.totalBookmarks": "Marcadores totales",
  "analytics.totalWatchTime": "Tiempo de visualización",
  "analytics.courseBreakdown": "Desglose por Curso",
  "analytics.completionRate": "Tasa de finalización",
  "analyticsIns.title": "Analíticas del Curso",
  "analyticsIns.description": "Monitorea el progreso estudiantil y rendimiento del curso.",
  "analyticsIns.totalStudents": "Estudiantes totales",
  "analyticsIns.activeStudents": "Estudiantes activos",
  "analyticsIns.completionRate": "Tasa de finalización",
  "analyticsIns.avgRating": "Calificación promedio",
  "analyticsIns.enrollmentTrend": "Tendencia de Inscripciones",
  "analyticsIns.coursePerformance": "Rendimiento del Curso",
  "analyticsIns.studentEngagement": "Participación Estudiantil",
  "analyticsIns.notesPerStudent": "Notas por estudiante",
  "analyticsIns.quizAttempts": "Intentos de quiz",
  "analyticsIns.quizPassRate": "Tasa de aprobación",
  "analyticsIns.recentStudents": "Estudiantes Recientes",
  "admin.tenants": "Inquilinos",
  "admin.users": "Usuarios",
  "admin.auditLog": "Registro de Auditoría",
  "admin.export": "Exportar",
  "admin.suspend": "Suspender",
  "admin.unsuspend": "Reactivar",
  "admin.active": "Activo",
  "admin.suspended": "Suspendido",
  "settings.title": "Configuración",
  "settings.profile": "Perfil",
  "settings.notifications": "Notificaciones",
  "common.loading": "Cargando...",
  "common.error": "Ocurrió un error",
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.delete": "Eliminar",
  "common.search": "Buscar",
  "common.noData": "Sin datos disponibles",
  "common.back": "Volver",
  "common.viewAll": "Ver todo",
  "common.days": "días",
  "common.weeks": "semanas",
};

const LOCALE_MAP: Record<string, Record<TranslationKey, string>> = {
  en,
  es,
};

export function getTranslations(locale: string): Record<TranslationKey, string> {
  return LOCALE_MAP[locale] ?? en;
}

export function t(locale: string, key: TranslationKey): string {
  return getTranslations(locale)[key] ?? en[key] ?? key;
}
