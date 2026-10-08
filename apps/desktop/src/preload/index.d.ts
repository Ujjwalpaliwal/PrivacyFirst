import { PrivacyFirstAPI } from './index';

declare global {
  interface Window {
    privacyFirst: PrivacyFirstAPI;
  }
}
