"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = exports.UserProvider = exports.UserContext = void 0;
var jsx_runtime_1 = require("react/jsx-runtime");
var hooks_1 = require("preact/hooks");
var preact_1 = require("preact");
var axios_1 = require("axios");
require("./app.css");
var emptyUserContext = {};
exports.UserContext = (0, preact_1.createContext)(emptyUserContext);
var UserProvider = function (_a) {
    var children = _a.children;
    var _b = (0, hooks_1.useState)(""), apiKey = _b[0], setApiKey = _b[1];
    return ((0, jsx_runtime_1.jsx)(exports.UserContext.Provider, { value: { apiKey: apiKey, setApiKey: setApiKey }, children: children }));
};
exports.UserProvider = UserProvider;
function App() {
    return ((0, jsx_runtime_1.jsx)("div", { className: "app-container", children: (0, jsx_runtime_1.jsxs)(exports.UserProvider, { children: [(0, jsx_runtime_1.jsx)(Header, {}), (0, jsx_runtime_1.jsx)(Home, {}), (0, jsx_runtime_1.jsx)(Footer, {})] }) }));
}
exports.App = App;
function Header() {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "header-container", children: [(0, jsx_runtime_1.jsx)("div", { children: "orpheus" }), (0, jsx_runtime_1.jsxs)("div", { className: "header-right", children: [(0, jsx_runtime_1.jsx)("div", { children: "Login" }), (0, jsx_runtime_1.jsx)("div", { children: "Sign-Up" })] })] }));
}
function Home() {
    var apiKey = (0, hooks_1.useContext)(exports.UserContext).apiKey;
    var _a = (0, hooks_1.useState)(''), inputText = _a[0], setInputText = _a[1];
    var _b = (0, hooks_1.useState)([]), messages = _b[0], setMessages = _b[1];
    var handleInputChange = function (e) {
        if (e.target instanceof HTMLInputElement)
            setInputText(e.target.value);
    };
    var handleClick = function (_) {
        axios_1.default.post("http://127.0.0.1:3000/ai", {
            apiKey: apiKey,
            input: inputText
        }, { headers: {
                "Content-Type": "application/json"
            } })
            .then(function (response) {
            setMessages(function (prev) { return __spreadArray([response.data], prev, true); });
        })
            .catch(function (err) { return console.log(err); });
    };
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "center-div", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Ask Anything...", value: inputText, onChange: handleInputChange }), (0, jsx_runtime_1.jsx)("button", { onClick: handleClick, className: "button-clean", children: ">>>" })] }), (0, jsx_runtime_1.jsx)("div", { children: messages && messages.map(function (msg) {
                    console.log(msg);
                    return JSON.stringify(msg.choices[0].message.content);
                }) })] }));
}
function Footer() {
    return ((0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)(Dev, {}) }));
}
function Dev() {
    var _a = (0, hooks_1.useContext)(exports.UserContext), apiKey = _a.apiKey, setApiKey = _a.setApiKey;
    var onApiKeyChange = function (e) {
        if (e.target instanceof HTMLInputElement)
            setApiKey(e.target.value);
    };
    return ((0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsxs)("span", { children: ["API_KEY: ", (0, jsx_runtime_1.jsx)("input", { onChange: onApiKeyChange, value: apiKey, type: "text" })] }) }));
}
