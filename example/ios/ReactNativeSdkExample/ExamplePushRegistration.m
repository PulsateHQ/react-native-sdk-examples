#import <React/RCTBridgeModule.h>

// Registers the Swift class above with React Native. Example-app glue only —
// the library's own module is codegen'd, and nothing here ships to partners.
@interface RCT_EXTERN_MODULE (ExamplePushRegistration, NSObject)

RCT_EXTERN_METHOD(requestAuthorization
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getRegistrationOutcome
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)

@end
