let iosSwitch: HTMLLabelElement | null = null;

/**
 * Light tap feedback. Android uses the Vibration API; iOS Safari has none,
 * but toggling a native switch input (iOS 18+) plays the system haptic.
 * Must be called from inside a user gesture.
 */
export function haptic(pattern: number | number[] = 10) {
  if (typeof window === "undefined") return;
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
    return;
  }
  if (!iosSwitch) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.appendChild(input);
    label.setAttribute("aria-hidden", "true");
    label.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(label);
    iosSwitch = label;
  }
  iosSwitch.click();
}
