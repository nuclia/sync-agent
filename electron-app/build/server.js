"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopToListen = exports.startToListen = void 0;
var express_1 = __importDefault(require("express"));
var fs_1 = require("fs");
var promises_1 = __importDefault(require("fs/promises"));
var os_1 = __importDefault(require("os"));
var path_1 = __importDefault(require("path"));
var uuid_1 = require("uuid");
var basePath = "".concat(os_1.default.homedir(), "/.nuclia");
console.log("basePath", basePath);
var defaultConfig = {
    syncPeriod: 3600, // In seconds
};
function createFile(path, content) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, promises_1.default.writeFile(path, content)];
                case 1:
                    _a.sent();
                    console.log("File created at ".concat(path));
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error("Error creating file:", error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function createDirectory(path) {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, promises_1.default.mkdir(path, { recursive: true })];
                case 1:
                    _a.sent();
                    console.log("Directory created at ".concat(path));
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.error("Error creating directory:", error_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function pathExists(path) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, promises_1.default.access(path, fs_1.constants.F_OK)];
                case 1:
                    _b.sent();
                    return [2 /*return*/, true];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function findFilesInDirectory(directory, extensions) {
    return __awaiter(this, void 0, void 0, function () {
        function walk(currentPath) {
            return __awaiter(this, void 0, void 0, function () {
                var items, _loop_1, _i, items_1, item;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, promises_1.default.readdir(currentPath, { withFileTypes: true })];
                        case 1:
                            items = _a.sent();
                            _loop_1 = function (item) {
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            if (!item.isDirectory()) return [3 /*break*/, 2];
                                            return [4 /*yield*/, walk(path_1.default.join(currentPath, item.name))];
                                        case 1:
                                            _b.sent();
                                            return [3 /*break*/, 3];
                                        case 2:
                                            if (extensions.some(function (ext) { return item.name.endsWith(ext); })) {
                                                result.push(path_1.default.join(currentPath, item.name));
                                            }
                                            _b.label = 3;
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            };
                            _i = 0, items_1 = items;
                            _a.label = 2;
                        case 2:
                            if (!(_i < items_1.length)) return [3 /*break*/, 5];
                            item = items_1[_i];
                            return [5 /*yield**/, _loop_1(item)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 2];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        }
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    result = [];
                    return [4 /*yield*/, walk(directory)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
var appExpress = (0, express_1.default)();
var server;
appExpress.use(express_1.default.json());
appExpress.get("/", function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                result = [];
                return [4 /*yield*/, pathExists(basePath)];
            case 1:
                if (!!(_a.sent())) return [3 /*break*/, 2];
                res.status(404).send("Nuclia folder does not exist");
                return [3 /*break*/, 4];
            case 2: return [4 /*yield*/, findFilesInDirectory(basePath, [".json"])];
            case 3:
                result = _a.sent();
                res.status(200).send(JSON.stringify({
                    result: result,
                }));
                _a.label = 4;
            case 4: return [2 /*return*/];
        }
    });
}); });
appExpress.get("/status", function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.status(200).send("Server is running");
        return [2 /*return*/];
    });
}); });
appExpress.get("/sources", function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var data;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, promises_1.default.readFile("".concat(basePath, "/sources.json"), "utf8")];
            case 1:
                data = _a.sent();
                res.status(200).send(JSON.parse(data));
                return [2 /*return*/];
        }
    });
}); });
appExpress.post("/sources", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var dataNewSource, uuid, currentSources, _a, _b, sourceAlreadyExists;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                dataNewSource = req.body;
                uuid = (0, uuid_1.v4)();
                _b = (_a = JSON).parse;
                return [4 /*yield*/, promises_1.default.readFile("".concat(basePath, "/sources.json"), "utf8")];
            case 1:
                currentSources = _b.apply(_a, [_c.sent()]);
                sourceAlreadyExists = uuid in currentSources;
                if (sourceAlreadyExists) {
                    res
                        .status(409)
                        .send({ reason: "Source with id ".concat(dataNewSource.id, " already exists") });
                    return [2 /*return*/];
                }
                currentSources[uuid] = dataNewSource;
                return [4 /*yield*/, promises_1.default.writeFile("".concat(basePath, "/sources.json"), JSON.stringify(currentSources, null, 2))];
            case 2:
                _c.sent();
                res.status(201).send({
                    id: dataNewSource.id,
                });
                return [2 /*return*/];
        }
    });
}); });
appExpress.get("/source/:id", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, currentSources, _a, _b, error_3;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                id = req.params.id;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                _b = (_a = JSON).parse;
                return [4 /*yield*/, promises_1.default.readFile("".concat(basePath, "/sources.json"), "utf8")];
            case 2:
                currentSources = _b.apply(_a, [_c.sent()]);
                if (!(id in currentSources)) {
                    res.status(404).send(null);
                }
                else {
                    res.status(200).send(currentSources[id]);
                }
                return [3 /*break*/, 4];
            case 3:
                error_3 = _c.sent();
                console.error(error_3);
                res.status(404).send(null);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
appExpress.patch("/source/:id", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, dataNewSource, currentSources, _a, _b, error_4;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                id = req.params.id;
                dataNewSource = req.body;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 6, , 7]);
                _b = (_a = JSON).parse;
                return [4 /*yield*/, promises_1.default.readFile("".concat(basePath, "/sources.json"), "utf8")];
            case 2:
                currentSources = _b.apply(_a, [_c.sent()]);
                if (!!(id in currentSources)) return [3 /*break*/, 3];
                res.status(404).send(null);
                return [3 /*break*/, 5];
            case 3:
                currentSources[id] = __assign(__assign({}, currentSources[id]), dataNewSource);
                return [4 /*yield*/, promises_1.default.writeFile("".concat(basePath, "/sources.json"), JSON.stringify(currentSources, null, 2))];
            case 4:
                _c.sent();
                res.status(200).send(null);
                _c.label = 5;
            case 5: return [3 /*break*/, 7];
            case 6:
                error_4 = _c.sent();
                console.error(error_4);
                res.status(404).send(null);
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
appExpress.delete("/source/:id", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, currentSources, _a, _b, error_5;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                id = req.params.id;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 6, , 7]);
                _b = (_a = JSON).parse;
                return [4 /*yield*/, promises_1.default.readFile("".concat(basePath, "/sources.json"), "utf8")];
            case 2:
                currentSources = _b.apply(_a, [_c.sent()]);
                if (!!(id in currentSources)) return [3 /*break*/, 3];
                res.status(404).send(null);
                return [3 /*break*/, 5];
            case 3:
                delete currentSources[id];
                return [4 /*yield*/, promises_1.default.writeFile("".concat(basePath, "/sources.json"), JSON.stringify(currentSources, null, 2))];
            case 4:
                _c.sent();
                res.status(200).send(null);
                _c.label = 5;
            case 5: return [3 /*break*/, 7];
            case 6:
                error_5 = _c.sent();
                console.error(error_5);
                res.status(404).send(null);
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
appExpress.post("/stop", function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        stopToListen();
        res.status(200).send(null);
        return [2 /*return*/];
    });
}); });
appExpress.patch("/config/:paramKey", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var paramKey, value, data, configData, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                paramKey = req.params.paramKey;
                value = req.body.value;
                return [4 /*yield*/, promises_1.default.readFile("".concat(basePath, "/config.json"), "utf8")];
            case 1:
                data = _a.sent();
                configData = JSON.parse(data);
                if (!(paramKey in configData)) return [3 /*break*/, 3];
                configData[paramKey] = value;
                return [4 /*yield*/, promises_1.default.writeFile("".concat(basePath, "/config.json"), JSON.stringify(configData, null, 2))];
            case 2:
                _a.sent();
                res.status(204).send(null);
                return [3 /*break*/, 4];
            case 3:
                res.status(412).send({
                    reason: "Parameter ".concat(paramKey, " does not exist in config file"),
                });
                _a.label = 4;
            case 4: return [3 /*break*/, 6];
            case 5:
                error_6 = _a.sent();
                console.error(error_6);
                res.status(400).send(null);
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
function startToListen(callback) {
    return __awaiter(this, void 0, void 0, function () {
        var configPath, sourcesPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, pathExists(basePath)];
                case 1:
                    if (!!(_a.sent())) return [3 /*break*/, 3];
                    return [4 /*yield*/, createDirectory(basePath)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [4 /*yield*/, pathExists("".concat(basePath, "/sources"))];
                case 4:
                    if (!!(_a.sent())) return [3 /*break*/, 6];
                    return [4 /*yield*/, createDirectory("".concat(basePath, "/sources"))];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6:
                    configPath = "".concat(basePath, "/config.json");
                    return [4 /*yield*/, pathExists(configPath)];
                case 7:
                    if (!!(_a.sent())) return [3 /*break*/, 9];
                    return [4 /*yield*/, createFile(configPath, JSON.stringify(defaultConfig, null, 2))];
                case 8:
                    _a.sent();
                    _a.label = 9;
                case 9:
                    sourcesPath = "".concat(basePath, "/sources.json");
                    return [4 /*yield*/, pathExists(sourcesPath)];
                case 10:
                    if (!!(_a.sent())) return [3 /*break*/, 12];
                    return [4 /*yield*/, createFile(sourcesPath, JSON.stringify({}, null, 2))];
                case 11:
                    _a.sent();
                    _a.label = 12;
                case 12:
                    if (server && server.listening) {
                        console.log("Process is already running.");
                        return [2 /*return*/];
                    }
                    console.log("Start process");
                    server = appExpress.listen(8000);
                    if (callback) {
                        callback();
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.startToListen = startToListen;
function stopToListen(callback) {
    if (server && server.listening) {
        console.log("Stop process");
        server.close();
        if (callback) {
            callback();
        }
        return;
    }
    console.log("Process is not running.");
}
exports.stopToListen = stopToListen;
