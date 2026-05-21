import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { usePrefsStore } from './stores/prefsStore';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from './components/layout/ProtectedRoute';
import { LanternLoader } from './components/ui/LanternLoader';
import { PageTranslator } from './components/i18n/PageTranslator';

const LandingPage         = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage           = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage        = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage  = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage   = lazy(() => import('./pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const OnboardingPage      = lazy(() => import('./pages/auth/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const DashboardPage       = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const CourseMapPage       = lazy(() => import('./pages/CourseMapPage').then(m => ({ default: m.CourseMapPage })));
const CourseWorksheetsPage = lazy(() => import('./pages/CourseWorksheetsPage').then(m => ({ default: m.CourseWorksheetsPage })));
const LessonPage          = lazy(() => import('./pages/LessonPage').then(m => ({ default: m.LessonPage })));
const QuizPage            = lazy(() => import('./pages/QuizPage').then(m => ({ default: m.QuizPage })));
const StudyCoachPage      = lazy(() => import('./pages/StudyCoachPage').then(m => ({ default: m.StudyCoachPage })));
const ContentStudioPage   = lazy(() => import('./pages/ContentStudioPage').then(m => ({ default: m.ContentStudioPage })));
const ResourcesPage       = lazy(() => import('./pages/ResourcesPage').then(m => ({ default: m.ResourcesPage })));
const CommunityPage       = lazy(() => import('./pages/CommunityPage').then(m => ({ default: m.CommunityPage })));
const ProfileSettingsPage = lazy(() => import('./pages/ProfileSettingsPage').then(m => ({ default: m.ProfileSettingsPage })));
const NotFoundPage        = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

export function App() {
  const { fetchMe } = useAuthStore();
  const { loadFromDB } = usePrefsStore();

  useEffect(() => {
    fetchMe();
    loadFromDB();
  }, [fetchMe, loadFromDB]);

  return (
    <Suspense fallback={<LanternLoader />}>
      <PageTranslator />
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/lessons/:id" element={<LessonPage />} />
          <Route path="/lessons/:id/quiz" element={<QuizPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/map" element={<CourseMapPage />} />
            <Route path="/courses/:slug" element={<CourseWorksheetsPage />} />
            <Route path="/worksheets" element={<CourseWorksheetsPage />} />
            <Route path="/coach" element={<StudyCoachPage />} />
            <Route path="/content-studio" element={<ContentStudioPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/village" element={<CommunityPage />} />
            <Route path="/profile/settings" element={<ProfileSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
