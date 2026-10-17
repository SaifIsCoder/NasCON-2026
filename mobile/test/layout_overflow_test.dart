import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nascon_mobile/app.dart';
import 'package:nascon_mobile/core/theme/app_theme.dart';
import 'package:nascon_mobile/screens/auth/login_screen.dart';
import 'package:nascon_mobile/screens/matches/match_detail_screen.dart';
import 'package:nascon_mobile/screens/roster/roster_management_screen.dart';
import 'package:nascon_mobile/screens/scoring/scoring_entry_screen.dart';
import 'package:nascon_mobile/screens/store/cart_checkout_screen.dart';
import 'package:nascon_mobile/screens/store/product_detail_screen.dart';
import 'package:nascon_mobile/screens/store/receipt_screen.dart';
import 'package:nascon_mobile/screens/sync/sync_queue_screen.dart';

void main() {
  group('360x640dp Small Screen Viewport & Overflow Tests', () {
    testWidgets('LeagueHubApp renders on 360x640dp without any overflow',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      // Do not catch exception to see full offending widget
      await tester.pumpWidget(const LeagueHubApp());
      await tester.pumpAndSettle();

      // Tab 1: Standings
      await tester.tap(find.text('Standings'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      // Tab 2: Clubs
      await tester.tap(find.text('Clubs'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      // Tab 3: Store
      await tester.tap(find.text('Store'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      // Tab 4: Profile
      await tester.tap(find.text('Profile'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });

    testWidgets('Secondary screens render on 360x640dp without overflow',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final testScreens = <Widget>[
        const LoginScreen(),
        const MatchDetailScreen(),
        const ProductDetailScreen(),
        const CartCheckoutScreen(),
        const ReceiptScreen(),
        const RosterManagementScreen(),
        const ScoringEntryScreen(),
        const SyncQueueScreen(),
      ];

      for (final screen in testScreens) {
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.lightTheme,
            home: screen,
          ),
        );
        await tester.pumpAndSettle();
      }
    });
  });
}
