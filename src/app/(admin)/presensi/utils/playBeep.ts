// Plays the store-scanner beep sound file for scan feedback.
let beepAudio: HTMLAudioElement | null = null

export function playBeep() {
  try {
    if (!beepAudio) {
      beepAudio = new Audio('/sounds/store-scanner-beep.mp3')
    }
    beepAudio.currentTime = 0
    void beepAudio.play()
  } catch {
    // Ignore: audio playback is a nice-to-have, never block scanning on it
  }
}
