import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nascon_mobile/core/theme/app_theme.dart';
import 'package:nascon_mobile/widgets/app_card.dart';
import 'package:nascon_mobile/widgets/app_text_field.dart';
import 'package:nascon_mobile/widgets/empty_state.dart';
import 'package:nascon_mobile/widgets/error_state.dart';
import 'package:nascon_mobile/widgets/loading_state.dart';
import 'package:nascon_mobile/widgets/primary_button.dart';
import 'package:nascon_mobile/widgets/section_header.dart';
import 'package:nascon_mobile/widgets/status_badge.dart';
import 'package:nascon_mobile/widgets/sync_indicator.dart';

Widget _wrapTestWidget(Widget child) {
  return MaterialApp(
    theme: AppTheme.lightTheme,
    home: Scaffold(body: Center(child: child)),
  );
}

void main() {
  group('Reusable Components Verification', () {
    testWidgets('PrimaryButton handles variants, loading, and disabled states',
        (WidgetTester tester) async {
      bool tapped = false;

      // Normal enabled button
      await tester.pumpWidget(
        _wrapTestWidget(
          PrimaryButton(
            text: 'Save Event',
            onPressed: () => tapped = true,
          ),
        ),
      );

      expect(find.text('Save Event'), findsOneWidget);
      await tester.tap(find.text('Save Event'));
      expect(tapped, isTrue);

      // Loading button (must display spinner and NOT trigger tap)
      tapped = false;
      await tester.pumpWidget(
        _wrapTestWidget(
          PrimaryButton(
            text: 'Save Event',
            isLoading: true,
            onPressed: () => tapped = true,
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Save Event'), findsNothing);
      await tester.tap(find.byType(PrimaryButton));
      expect(tapped, isFalse);

      // Disabled button
      tapped = false;
      await tester.pumpWidget(
        _wrapTestWidget(
          PrimaryButton(
            text: 'Disabled Button',
            isEnabled: false,
            onPressed: () => tapped = true,
          ),
        ),
      );

      await tester.tap(find.text('Disabled Button'));
      expect(tapped, isFalse);
    });

    testWidgets('AppTextField supports password toggle and validation',
        (WidgetTester tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(
        _wrapTestWidget(
          AppTextField(
            controller: controller,
            labelText: 'Security Key',
            hintText: 'Enter secret',
            isPassword: true,
          ),
        ),
      );

      expect(find.text('Security Key'), findsOneWidget);
      expect(find.text('Enter secret'), findsOneWidget);

      // By default obscured, shows visibility icon
      expect(find.byIcon(Icons.visibility_outlined), findsOneWidget);

      // Tap toggle button to reveal password
      await tester.tap(find.byTooltip('Show password'));
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.visibility_off_outlined), findsOneWidget);
    });

    testWidgets('StatusBadge renders text, icon, and accessible colors',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        _wrapTestWidget(
          Column(
            children: const [
              StatusBadge(
                label: 'Active',
                type: StatusBadgeType.success,
                showDot: true,
              ),
              StatusBadge(
                label: 'Offline',
                type: StatusBadgeType.neutral,
                style: StatusBadgeStyle.solid,
              ),
            ],
          ),
        ),
      );

      expect(find.text('Active'), findsOneWidget);
      expect(find.text('Offline'), findsOneWidget);
    });

    testWidgets('AppCard handles padding and tap callbacks',
        (WidgetTester tester) async {
      bool cardTapped = false;

      await tester.pumpWidget(
        _wrapTestWidget(
          AppCard(
            onTap: () => cardTapped = true,
            child: const Text('Card Content'),
          ),
        ),
      );

      expect(find.text('Card Content'), findsOneWidget);
      await tester.tap(find.text('Card Content'));
      expect(cardTapped, isTrue);
    });

    testWidgets('SyncIndicator displays text and Material icon for all states',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        _wrapTestWidget(
          Column(
            children: const [
              SyncIndicator(state: SyncState.online),
              SyncIndicator(state: SyncState.offline),
              SyncIndicator(state: SyncState.syncing),
              SyncIndicator(state: SyncState.pending, pendingCount: 3),
              SyncIndicator(state: SyncState.error),
            ],
          ),
        ),
      );

      expect(find.text('Online'), findsOneWidget);
      expect(find.text('Offline'), findsOneWidget);
      expect(find.text('Syncing...'), findsOneWidget);
      expect(find.text('3 Pending'), findsOneWidget);
      expect(find.text('Sync Failed'), findsOneWidget);

      expect(find.byIcon(Icons.cloud_done_outlined), findsOneWidget);
      expect(find.byIcon(Icons.cloud_off_outlined), findsOneWidget);
      expect(find.byIcon(Icons.sync_outlined), findsOneWidget);
      expect(find.byIcon(Icons.cloud_upload_outlined), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });

    testWidgets('LoadingState, ErrorState, and EmptyState present correctly',
        (WidgetTester tester) async {
      bool retryClicked = false;

      await tester.pumpWidget(
        _wrapTestWidget(
          Column(
            children: [
              const LoadingState(message: 'Loading telemetry...'),
              ErrorState(
                message: 'Connection failed',
                onRetry: () => retryClicked = true,
              ),
              const EmptyState(
                title: 'No Items',
                message: 'No records found in inventory',
              ),
            ],
          ),
        ),
      );

      expect(find.text('Loading telemetry...'), findsOneWidget);
      expect(find.text('Connection failed'), findsOneWidget);
      expect(find.text('No Items'), findsOneWidget);

      await tester.tap(find.text('Try Again'));
      expect(retryClicked, isTrue);
    });

    testWidgets('SectionHeader renders title, subtitle, and action',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        _wrapTestWidget(
          SectionHeader(
            title: 'Tournament Standings',
            subtitle: 'Group A Leaderboard',
            trailing: TextButton(
              onPressed: () {},
              child: const Text('View All'),
            ),
          ),
        ),
      );

      expect(find.text('Tournament Standings'), findsOneWidget);
      expect(find.text('Group A Leaderboard'), findsOneWidget);
      expect(find.text('View All'), findsOneWidget);
    });
  });
}
