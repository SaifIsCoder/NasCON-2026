/// Core constants for LeagueHub application.
class AppConstants {
  AppConstants._();

  static const String appName = 'LeagueHub';
  static const String appTagline = 'Multi-Sport League & Club Operations';
  static const String phaseNotice = 'Phase 1: Foundation & Design System';

  // Navigation Routes
  static const String routeRoot = '/';
  static const String routeLogin = '/auth/login';
  static const String routeFixtures = '/fixtures';
  static const String routeMatchDetail = '/matches/detail';
  static const String routeStandings = '/standings';
  static const String routeClubs = '/clubs';
  static const String routeClubProfile = '/clubs/profile';
  static const String routeStore = '/store';
  static const String routeProductDetail = '/store/product';
  static const String routeCartCheckout = '/store/checkout';
  static const String routeReceipt = '/store/receipt';
  static const String routeRosterManagement = '/roster/manage';
  static const String routeScoringEntry = '/scoring/entry';
  static const String routeSyncQueue = '/sync/queue';
  static const String routeProfile = '/profile';

  // Supported Sports Taxonomy (Foundation)
  static const List<String> supportedSports = [
    'Football',
    'Cricket',
    'Basketball',
    'Volleyball',
    'Custom / Mystery Sport',
  ];
}
