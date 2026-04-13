import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Firebase          
import UserNotifications 

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {

    // ✅ Firebase Configure - 
    FirebaseApp.configure()

    // ✅ Notification Delegate
    UNUserNotificationCenter.current().delegate = self

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "mulyam",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  // // ✅ Foreground এ Notification 
  // func userNotificationCenter(
  //   _ center: UNUserNotificationCenter,
  //   willPresent notification: UNNotification,
  //   withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  // ) {
  //   completionHandler([.banner, .sound, .badge])
  // }

//   // ✅ Notification Click handle
//   func userNotificationCenter(
//     _ center: UNUserNotificationCenter,
//     didReceive response: UNNotificationResponse,
//     withCompletionHandler completionHandler: @escaping () -> Void
//   ) {
//     completionHandler()
//   }
 }

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}