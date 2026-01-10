import { LocalDetectionProvider } from "./detection-provider"
import { LocalVideoSearchProvider } from "./video-understanding-provider"

// Provider coordinator - uses fallbacks when advanced providers aren't configured
export class ProviderCoordinator {
  private detectionProvider = new LocalDetectionProvider()
  private videoSearchProvider = new LocalVideoSearchProvider()

  getDetectionProvider() {
    return this.detectionProvider
  }

  getVideoSearchProvider() {
    return this.videoSearchProvider
  }

  getStatus() {
    return {
      detection: this.detectionProvider.isConfigured() ? "local" : "unconfigured",
      videoSearch: this.videoSearchProvider.isConfigured() ? "local" : "unconfigured",
    }
  }
}

export const providerCoordinator = new ProviderCoordinator()
