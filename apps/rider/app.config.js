const base = require("./app.json").expo;

module.exports = {
  expo: {
    ...base,
    plugins: [
      ["expo-location", { isAndroidBackgroundLocationEnabled: true, isIosBackgroundLocationEnabled: true, isAndroidForegroundServiceEnabled: true }],
    ],
    android: {
      ...(base.android || {}),
      config: {
        ...(base.android?.config || {}),
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || "",
        },
      },
    },
    ios: {
      ...(base.ios || {}),
      config: {
        ...(base.ios?.config || {}),
        googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY || "",
      },
    },
  },
};
