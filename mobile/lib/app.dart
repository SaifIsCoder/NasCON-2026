import 'package:flutter/material.dart';
import 'core/constants/app_constants.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';

/// Root application widget for LeagueHub.
/// Configures centralized Material 3 theme, initial route, and single source-of-truth router.
class LeagueHubApp extends StatelessWidget {
  const LeagueHubApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      initialRoute: AppConstants.routeRoot,
      onGenerateRoute: AppRouter.onGenerateRoute,
    );
  }
}
