import 'package:flutter_test/flutter_test.dart';
import 'package:nascon_mobile/app.dart';

void main() {
  group('LeagueHub Bottom Navigation & Routing Tests', () {
    testWidgets('App starts with 5 bottom navigation tabs and Fixtures tab active',
        (WidgetTester tester) async {
      await tester.pumpWidget(const LeagueHubApp());
      await tester.pumpAndSettle();

      // Verify app title in AppBar
      expect(find.text('LeagueHub'), findsOneWidget);
      expect(find.text('Fixtures'), findsWidgets); // Header and tab label

      // Verify all 5 tab destinations exist
      expect(find.text('Fixtures'), findsWidgets);
      expect(find.text('Standings'), findsOneWidget);
      expect(find.text('Clubs'), findsOneWidget);
      expect(find.text('Store'), findsOneWidget);
      expect(find.text('Profile'), findsOneWidget);

      // Verify initial Fixtures content
      expect(find.text('League Fixtures & Schedule'), findsOneWidget);
    });

    testWidgets('Switching tabs updates active screen and AppBar title',
        (WidgetTester tester) async {
      await tester.pumpWidget(const LeagueHubApp());
      await tester.pumpAndSettle();

      // Tap 'Standings' tab
      await tester.tap(find.text('Standings'));
      await tester.pumpAndSettle();
      expect(find.text('Standings & Leaderboards'), findsOneWidget);

      // Tap 'Clubs' tab
      await tester.tap(find.text('Clubs'));
      await tester.pumpAndSettle();
      expect(find.text('Clubs & Organizations'), findsOneWidget);

      // Tap 'Store' tab
      await tester.tap(find.text('Store'));
      await tester.pumpAndSettle();
      expect(find.text('Official Merchandise Store'), findsOneWidget);

      // Tap 'Profile' tab
      await tester.tap(find.text('Profile'));
      await tester.pumpAndSettle();
      expect(find.text('User Profile & Settings'), findsOneWidget);

      // Tap back to 'Fixtures' tab
      await tester.tap(find.text('Fixtures').last);
      await tester.pumpAndSettle();
      expect(find.text('League Fixtures & Schedule'), findsOneWidget);
    });

    testWidgets('Navigating to sub-routes and back works smoothly',
        (WidgetTester tester) async {
      await tester.pumpWidget(const LeagueHubApp());
      await tester.pumpAndSettle();

      // Tap button to navigate to Match Detail
      final detailButton = find.text('View Sample Match Detail Route');
      expect(detailButton, findsOneWidget);
      await tester.tap(detailButton);
      await tester.pumpAndSettle();

      // Verify Match Details screen
      expect(find.text('Match Details'), findsOneWidget);
      expect(find.text('Fixture Projection'), findsOneWidget);

      // Tap back button
      final backButton = find.byTooltip('Back');
      expect(backButton, findsOneWidget);
      await tester.tap(backButton);
      await tester.pumpAndSettle();

      // Verify returned to Fixtures screen
      expect(find.text('League Fixtures & Schedule'), findsOneWidget);
    });

    testWidgets('Sync indicator in AppBar navigates to Sync Queue',
        (WidgetTester tester) async {
      await tester.pumpWidget(const LeagueHubApp());
      await tester.pumpAndSettle();

      // Tap the sync indicator
      final syncWidget = find.text('Online');
      expect(syncWidget, findsOneWidget);
      await tester.tap(syncWidget);
      await tester.pumpAndSettle();

      // Verify on Sync Queue screen
      expect(find.text('Sync Queue & Offline State'), findsOneWidget);
      expect(find.text('Queue Synchronized'), findsOneWidget);

      // Tap Return button
      final returnButton = find.text('Return to Operations Dashboard');
      await tester.ensureVisible(returnButton);
      await tester.tap(returnButton);
      await tester.pumpAndSettle();

      // Verify returned
      expect(find.text('LeagueHub'), findsOneWidget);
    });
  });
}
