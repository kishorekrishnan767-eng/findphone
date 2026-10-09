import 'dart:math';

/// Exponential backoff with ±20% jitter: 2 s, 4 s, 8 s … capped at 5 min. Jitter keeps a group of
/// test phones that lost the network together from retrying in lockstep.
class Backoff {
  Backoff({
    this.base = const Duration(seconds: 2),
    this.max = const Duration(minutes: 5),
    Random? random,
  }) : _random = random ?? Random();

  final Duration base;
  final Duration max;
  final Random _random;
  int _attempt = 0;

  int get attempt => _attempt;

  Duration next() {
    final exp = base.inMilliseconds * pow(2, _attempt);
    _attempt = min(_attempt + 1, 20);
    final capped = min(exp.toDouble(), max.inMilliseconds.toDouble());
    final jitter = 0.8 + _random.nextDouble() * 0.4;
    return Duration(milliseconds: min(capped * jitter, max.inMilliseconds.toDouble()).round());
  }

  void reset() => _attempt = 0;
}
