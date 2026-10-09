/// Decides whether a ring request seen in `rings/{phone}` should make this phone ring.
abstract final class RingPolicy {
  /// How long the alarm plays unless stopped from the app.
  static const duration = Duration(seconds: 30);

  /// Requests older than this are ignored: a phone that was off for an hour shouldn't start
  /// ringing the moment it reconnects.
  static const maxAge = Duration(minutes: 2);

  /// `requestedAt` is server time; tolerate a device clock that runs this far behind.
  static const clockSkew = Duration(minutes: 5);

  static bool shouldRing({
    required DateTime requestedAt,
    required bool acknowledged,
    required DateTime? lastHandled,
    required DateTime now,
  }) {
    if (acknowledged) return false; // already handled (possibly before a reinstall)
    if (lastHandled != null && !requestedAt.isAfter(lastHandled)) return false;
    final age = now.difference(requestedAt);
    return age < maxAge && age > -clockSkew;
  }
}
