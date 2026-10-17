import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';

/// Standardized application scaffold adhering to LeagueHub design rules:
/// - Consistent background and SafeArea handling
/// - Standardized AppBar with Primary Navy color
/// - Optional scrollable wrapper to prevent 360x640dp RenderFlex overflows
/// - Standard bottomNavigationBar and floatingActionButton integration
class AppScaffold extends StatelessWidget {
  const AppScaffold({
    super.key,
    required this.body,
    this.title,
    this.appBar,
    this.actions,
    this.leading,
    this.bottomNavigationBar,
    this.floatingActionButton,
    this.backgroundColor,
    this.padding = AppSpacing.screenPadding,
    this.scrollable = false,
    this.safeAreaTop = true,
    this.safeAreaBottom = true,
    this.resizeToAvoidBottomInset = true,
  });

  final Widget body;
  final String? title;
  final PreferredSizeWidget? appBar;
  final List<Widget>? actions;
  final Widget? leading;
  final Widget? bottomNavigationBar;
  final Widget? floatingActionButton;
  final Color? backgroundColor;
  final EdgeInsetsGeometry? padding;
  final bool scrollable;
  final bool safeAreaTop;
  final bool safeAreaBottom;
  final bool resizeToAvoidBottomInset;

  PreferredSizeWidget? _buildAppBar(BuildContext context) {
    if (appBar != null) return appBar;
    if (title == null) return null;

    final canPop = Navigator.of(context).canPop();

    return AppBar(
      title: Text(title!),
      leading: leading ??
          (canPop
              ? IconButton(
                  icon: const Icon(Icons.arrow_back_outlined),
                  onPressed: () => Navigator.of(context).maybePop(),
                  tooltip: 'Back',
                )
              : null),
      actions: actions,
    );
  }

  @override
  Widget build(BuildContext context) {
    Widget content = body;

    if (padding != null) {
      content = Padding(
        padding: padding!,
        child: content,
      );
    }

    if (scrollable) {
      content = SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: content,
      );
    }

    return Scaffold(
      backgroundColor: backgroundColor ?? AppColors.background,
      appBar: _buildAppBar(context),
      body: SafeArea(
        top: safeAreaTop,
        bottom: safeAreaBottom,
        child: content,
      ),
      bottomNavigationBar: bottomNavigationBar,
      floatingActionButton: floatingActionButton,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
    );
  }
}
