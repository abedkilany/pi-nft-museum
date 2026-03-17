"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/auth/me/route";
exports.ids = ["app/api/auth/me/route"];
exports.modules = {

/***/ "../../client/components/action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/client/components/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/action-async-storage.external.js");

/***/ }),

/***/ "../../client/components/request-async-storage.external":
/*!********************************************************************************!*\
  !*** external "next/dist/client/components/request-async-storage.external.js" ***!
  \********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/request-async-storage.external.js");

/***/ }),

/***/ "../../client/components/static-generation-async-storage.external":
/*!******************************************************************************************!*\
  !*** external "next/dist/client/components/static-generation-async-storage.external.js" ***!
  \******************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/static-generation-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2Fme%2Froute&page=%2Fapi%2Fauth%2Fme%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Fme%2Froute.ts&appDir=C%3A%5CUsers%5CUser%5CDesktop%5CPi%20NFT%20Museum%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CUser%5CDesktop%5CPi%20NFT%20Museum&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2Fme%2Froute&page=%2Fapi%2Fauth%2Fme%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Fme%2Froute.ts&appDir=C%3A%5CUsers%5CUser%5CDesktop%5CPi%20NFT%20Museum%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CUser%5CDesktop%5CPi%20NFT%20Museum&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var C_Users_User_Desktop_Pi_NFT_Museum_app_api_auth_me_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/auth/me/route.ts */ \"(rsc)/./app/api/auth/me/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/auth/me/route\",\n        pathname: \"/api/auth/me\",\n        filename: \"route\",\n        bundlePath: \"app/api/auth/me/route\"\n    },\n    resolvedPagePath: \"C:\\\\Users\\\\User\\\\Desktop\\\\Pi NFT Museum\\\\app\\\\api\\\\auth\\\\me\\\\route.ts\",\n    nextConfigOutput,\n    userland: C_Users_User_Desktop_Pi_NFT_Museum_app_api_auth_me_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/auth/me/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZhdXRoJTJGbWUlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRmF1dGglMkZtZSUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmF1dGglMkZtZSUyRnJvdXRlLnRzJmFwcERpcj1DJTNBJTVDVXNlcnMlNUNVc2VyJTVDRGVza3RvcCU1Q1BpJTIwTkZUJTIwTXVzZXVtJTVDYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj1DJTNBJTVDVXNlcnMlNUNVc2VyJTVDRGVza3RvcCU1Q1BpJTIwTkZUJTIwTXVzZXVtJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBc0c7QUFDdkM7QUFDYztBQUNxQjtBQUNsRztBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsZ0hBQW1CO0FBQzNDO0FBQ0EsY0FBYyx5RUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLGlFQUFpRTtBQUN6RTtBQUNBO0FBQ0EsV0FBVyw0RUFBVztBQUN0QjtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ3VIOztBQUV2SCIsInNvdXJjZXMiOlsid2VicGFjazovL3BpLW5mdC1tdXNldW0tYXBwLz9jMmYwIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFJvdXRlUm91dGVNb2R1bGUgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIkM6XFxcXFVzZXJzXFxcXFVzZXJcXFxcRGVza3RvcFxcXFxQaSBORlQgTXVzZXVtXFxcXGFwcFxcXFxhcGlcXFxcYXV0aFxcXFxtZVxcXFxyb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvYXV0aC9tZS9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL2F1dGgvbWVcIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL2F1dGgvbWUvcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCJDOlxcXFxVc2Vyc1xcXFxVc2VyXFxcXERlc2t0b3BcXFxcUGkgTkZUIE11c2V1bVxcXFxhcHBcXFxcYXBpXFxcXGF1dGhcXFxcbWVcXFxccm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcyB9ID0gcm91dGVNb2R1bGU7XG5jb25zdCBvcmlnaW5hbFBhdGhuYW1lID0gXCIvYXBpL2F1dGgvbWUvcm91dGVcIjtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgc2VydmVySG9va3MsXG4gICAgICAgIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2Fme%2Froute&page=%2Fapi%2Fauth%2Fme%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Fme%2Froute.ts&appDir=C%3A%5CUsers%5CUser%5CDesktop%5CPi%20NFT%20Museum%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CUser%5CDesktop%5CPi%20NFT%20Museum&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/auth/me/route.ts":
/*!**********************************!*\
  !*** ./app/api/auth/me/route.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_current_user__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/current-user */ \"(rsc)/./lib/current-user.ts\");\n\n\nasync function GET() {\n    const user = await (0,_lib_current_user__WEBPACK_IMPORTED_MODULE_1__.getCurrentUser)();\n    return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n        ok: true,\n        user\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2F1dGgvbWUvcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQTJDO0FBQ1M7QUFFN0MsZUFBZUU7SUFDcEIsTUFBTUMsT0FBTyxNQUFNRixpRUFBY0E7SUFFakMsT0FBT0QscURBQVlBLENBQUNJLElBQUksQ0FBQztRQUN2QkMsSUFBSTtRQUNKRjtJQUNGO0FBQ0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9waS1uZnQtbXVzZXVtLWFwcC8uL2FwcC9hcGkvYXV0aC9tZS9yb3V0ZS50cz9jNzIzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5leHRSZXNwb25zZSB9IGZyb20gJ25leHQvc2VydmVyJztcclxuaW1wb3J0IHsgZ2V0Q3VycmVudFVzZXIgfSBmcm9tICdAL2xpYi9jdXJyZW50LXVzZXInO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVCgpIHtcclxuICBjb25zdCB1c2VyID0gYXdhaXQgZ2V0Q3VycmVudFVzZXIoKTtcclxuXHJcbiAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHtcclxuICAgIG9rOiB0cnVlLFxyXG4gICAgdXNlclxyXG4gIH0pO1xyXG59Il0sIm5hbWVzIjpbIk5leHRSZXNwb25zZSIsImdldEN1cnJlbnRVc2VyIiwiR0VUIiwidXNlciIsImpzb24iLCJvayJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/auth/me/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/auth.ts":
/*!*********************!*\
  !*** ./lib/auth.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   createSessionToken: () => (/* binding */ createSessionToken),\n/* harmony export */   getAuthCookieName: () => (/* binding */ getAuthCookieName),\n/* harmony export */   hashPassword: () => (/* binding */ hashPassword),\n/* harmony export */   verifyPassword: () => (/* binding */ verifyPassword),\n/* harmony export */   verifySessionToken: () => (/* binding */ verifySessionToken)\n/* harmony export */ });\n/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! bcryptjs */ \"(rsc)/./node_modules/bcryptjs/index.js\");\n/* harmony import */ var jose__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! jose */ \"(rsc)/./node_modules/jose/dist/webapi/jwt/sign.js\");\n/* harmony import */ var jose__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! jose */ \"(rsc)/./node_modules/jose/dist/webapi/jwt/verify.js\");\n\n\nconst AUTH_COOKIE_NAME = \"pi_nft_auth\";\nfunction getSecretKey() {\n    const secret = process.env.AUTH_SECRET;\n    if (!secret) {\n        throw new Error(\"AUTH_SECRET is not set in .env\");\n    }\n    return new TextEncoder().encode(secret);\n}\nasync function hashPassword(password) {\n    return bcryptjs__WEBPACK_IMPORTED_MODULE_0__[\"default\"].hash(password, 10);\n}\nasync function verifyPassword(password, hash) {\n    return bcryptjs__WEBPACK_IMPORTED_MODULE_0__[\"default\"].compare(password, hash);\n}\nasync function createSessionToken(user) {\n    return new jose__WEBPACK_IMPORTED_MODULE_1__.SignJWT(user).setProtectedHeader({\n        alg: \"HS256\"\n    }).setIssuedAt().setExpirationTime(\"7d\").sign(getSecretKey());\n}\nasync function verifySessionToken(token) {\n    const { payload } = await (0,jose__WEBPACK_IMPORTED_MODULE_2__.jwtVerify)(token, getSecretKey());\n    return payload;\n}\nfunction getAuthCookieName() {\n    return AUTH_COOKIE_NAME;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvYXV0aC50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUE4QjtBQUNZO0FBRTFDLE1BQU1HLG1CQUFtQjtBQVd6QixTQUFTQztJQUNQLE1BQU1DLFNBQVNDLFFBQVFDLEdBQUcsQ0FBQ0MsV0FBVztJQUV0QyxJQUFJLENBQUNILFFBQVE7UUFDWCxNQUFNLElBQUlJLE1BQU07SUFDbEI7SUFFQSxPQUFPLElBQUlDLGNBQWNDLE1BQU0sQ0FBQ047QUFDbEM7QUFFTyxlQUFlTyxhQUFhQyxRQUFnQjtJQUNqRCxPQUFPYixxREFBVyxDQUFDYSxVQUFVO0FBQy9CO0FBRU8sZUFBZUUsZUFBZUYsUUFBZ0IsRUFBRUMsSUFBWTtJQUNqRSxPQUFPZCx3REFBYyxDQUFDYSxVQUFVQztBQUNsQztBQUVPLGVBQWVHLG1CQUFtQkMsSUFBaUI7SUFDeEQsT0FBTyxJQUFJakIseUNBQU9BLENBQUNpQixNQUNoQkMsa0JBQWtCLENBQUM7UUFBRUMsS0FBSztJQUFRLEdBQ2xDQyxXQUFXLEdBQ1hDLGlCQUFpQixDQUFDLE1BQ2xCQyxJQUFJLENBQUNuQjtBQUNWO0FBRU8sZUFBZW9CLG1CQUFtQkMsS0FBYTtJQUNwRCxNQUFNLEVBQUVDLE9BQU8sRUFBRSxHQUFHLE1BQU14QiwrQ0FBU0EsQ0FBQ3VCLE9BQU9yQjtJQUUzQyxPQUFPc0I7QUFDVDtBQUVPLFNBQVNDO0lBQ2QsT0FBT3hCO0FBQ1QiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9waS1uZnQtbXVzZXVtLWFwcC8uL2xpYi9hdXRoLnRzP2JmN2UiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGJjcnlwdCBmcm9tICdiY3J5cHRqcyc7XG5pbXBvcnQgeyBTaWduSldULCBqd3RWZXJpZnkgfSBmcm9tICdqb3NlJztcblxuY29uc3QgQVVUSF9DT09LSUVfTkFNRSA9ICdwaV9uZnRfYXV0aCc7XG5cbmV4cG9ydCB0eXBlIFNlc3Npb25Vc2VyID0ge1xuICB1c2VySWQ6IG51bWJlcjtcbiAgdXNlcm5hbWU6IHN0cmluZztcbiAgZW1haWw6IHN0cmluZztcbiAgcm9sZTogc3RyaW5nO1xuICBwaVVpZD86IHN0cmluZyB8IG51bGw7XG4gIHBpVXNlcm5hbWU/OiBzdHJpbmcgfCBudWxsO1xufTtcblxuZnVuY3Rpb24gZ2V0U2VjcmV0S2V5KCkge1xuICBjb25zdCBzZWNyZXQgPSBwcm9jZXNzLmVudi5BVVRIX1NFQ1JFVDtcblxuICBpZiAoIXNlY3JldCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQVVUSF9TRUNSRVQgaXMgbm90IHNldCBpbiAuZW52Jyk7XG4gIH1cblxuICByZXR1cm4gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKHNlY3JldCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYXNoUGFzc3dvcmQocGFzc3dvcmQ6IHN0cmluZykge1xuICByZXR1cm4gYmNyeXB0Lmhhc2gocGFzc3dvcmQsIDEwKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHZlcmlmeVBhc3N3b3JkKHBhc3N3b3JkOiBzdHJpbmcsIGhhc2g6IHN0cmluZykge1xuICByZXR1cm4gYmNyeXB0LmNvbXBhcmUocGFzc3dvcmQsIGhhc2gpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlU2Vzc2lvblRva2VuKHVzZXI6IFNlc3Npb25Vc2VyKSB7XG4gIHJldHVybiBuZXcgU2lnbkpXVCh1c2VyKVxuICAgIC5zZXRQcm90ZWN0ZWRIZWFkZXIoeyBhbGc6ICdIUzI1NicgfSlcbiAgICAuc2V0SXNzdWVkQXQoKVxuICAgIC5zZXRFeHBpcmF0aW9uVGltZSgnN2QnKVxuICAgIC5zaWduKGdldFNlY3JldEtleSgpKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHZlcmlmeVNlc3Npb25Ub2tlbih0b2tlbjogc3RyaW5nKSB7XG4gIGNvbnN0IHsgcGF5bG9hZCB9ID0gYXdhaXQgand0VmVyaWZ5KHRva2VuLCBnZXRTZWNyZXRLZXkoKSk7XG5cbiAgcmV0dXJuIHBheWxvYWQgYXMgdW5rbm93biBhcyBTZXNzaW9uVXNlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEF1dGhDb29raWVOYW1lKCkge1xuICByZXR1cm4gQVVUSF9DT09LSUVfTkFNRTtcbn1cbiJdLCJuYW1lcyI6WyJiY3J5cHQiLCJTaWduSldUIiwiand0VmVyaWZ5IiwiQVVUSF9DT09LSUVfTkFNRSIsImdldFNlY3JldEtleSIsInNlY3JldCIsInByb2Nlc3MiLCJlbnYiLCJBVVRIX1NFQ1JFVCIsIkVycm9yIiwiVGV4dEVuY29kZXIiLCJlbmNvZGUiLCJoYXNoUGFzc3dvcmQiLCJwYXNzd29yZCIsImhhc2giLCJ2ZXJpZnlQYXNzd29yZCIsImNvbXBhcmUiLCJjcmVhdGVTZXNzaW9uVG9rZW4iLCJ1c2VyIiwic2V0UHJvdGVjdGVkSGVhZGVyIiwiYWxnIiwic2V0SXNzdWVkQXQiLCJzZXRFeHBpcmF0aW9uVGltZSIsInNpZ24iLCJ2ZXJpZnlTZXNzaW9uVG9rZW4iLCJ0b2tlbiIsInBheWxvYWQiLCJnZXRBdXRoQ29va2llTmFtZSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/auth.ts\n");

/***/ }),

/***/ "(rsc)/./lib/current-user.ts":
/*!*****************************!*\
  !*** ./lib/current-user.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   getCurrentUser: () => (/* binding */ getCurrentUser)\n/* harmony export */ });\n/* harmony import */ var next_headers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/headers */ \"(rsc)/./node_modules/next/dist/api/headers.js\");\n/* harmony import */ var _auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./auth */ \"(rsc)/./lib/auth.ts\");\n\n\nasync function getCurrentUser() {\n    try {\n        const cookieStore = await (0,next_headers__WEBPACK_IMPORTED_MODULE_0__.cookies)();\n        const token = cookieStore.get((0,_auth__WEBPACK_IMPORTED_MODULE_1__.getAuthCookieName)())?.value;\n        if (!token) return null;\n        const user = await (0,_auth__WEBPACK_IMPORTED_MODULE_1__.verifySessionToken)(token);\n        return user;\n    } catch  {\n        return null;\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvY3VycmVudC11c2VyLnRzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUF1QztBQUN3QjtBQUV4RCxlQUFlRztJQUNwQixJQUFJO1FBQ0YsTUFBTUMsY0FBYyxNQUFNSixxREFBT0E7UUFDakMsTUFBTUssUUFBUUQsWUFBWUUsR0FBRyxDQUFDTCx3REFBaUJBLEtBQUtNO1FBRXBELElBQUksQ0FBQ0YsT0FBTyxPQUFPO1FBRW5CLE1BQU1HLE9BQU8sTUFBTU4seURBQWtCQSxDQUFDRztRQUN0QyxPQUFPRztJQUNULEVBQUUsT0FBTTtRQUNOLE9BQU87SUFDVDtBQUNGIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vcGktbmZ0LW11c2V1bS1hcHAvLi9saWIvY3VycmVudC11c2VyLnRzPzdlYTUiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY29va2llcyB9IGZyb20gJ25leHQvaGVhZGVycyc7XHJcbmltcG9ydCB7IGdldEF1dGhDb29raWVOYW1lLCB2ZXJpZnlTZXNzaW9uVG9rZW4gfSBmcm9tICcuL2F1dGgnO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEN1cnJlbnRVc2VyKCkge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBjb29raWVTdG9yZSA9IGF3YWl0IGNvb2tpZXMoKTtcclxuICAgIGNvbnN0IHRva2VuID0gY29va2llU3RvcmUuZ2V0KGdldEF1dGhDb29raWVOYW1lKCkpPy52YWx1ZTtcclxuXHJcbiAgICBpZiAoIXRva2VuKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgdmVyaWZ5U2Vzc2lvblRva2VuKHRva2VuKTtcclxuICAgIHJldHVybiB1c2VyO1xyXG4gIH0gY2F0Y2gge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG59Il0sIm5hbWVzIjpbImNvb2tpZXMiLCJnZXRBdXRoQ29va2llTmFtZSIsInZlcmlmeVNlc3Npb25Ub2tlbiIsImdldEN1cnJlbnRVc2VyIiwiY29va2llU3RvcmUiLCJ0b2tlbiIsImdldCIsInZhbHVlIiwidXNlciJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/current-user.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/jose","vendor-chunks/bcryptjs"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2Fme%2Froute&page=%2Fapi%2Fauth%2Fme%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Fme%2Froute.ts&appDir=C%3A%5CUsers%5CUser%5CDesktop%5CPi%20NFT%20Museum%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CUser%5CDesktop%5CPi%20NFT%20Museum&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();