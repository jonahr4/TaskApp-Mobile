Pod::Spec.new do |s|
  s.name           = 'WidgetData'
  s.version        = '1.0.0'
  s.summary        = 'Shares task data with iOS widgets via App Groups'
  s.description    = 'Expo native module that writes task data to shared UserDefaults for iOS widget extensions'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.frameworks = 'WidgetKit'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
