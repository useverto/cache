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
        while (_) try {
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
exports.__esModule = true;
exports.fetchCommunities = exports.cacheCommunities = exports.fetchCache = void 0;
var arweave_1 = __importDefault(require("arweave"));
var ar_gql_1 = require("ar-gql");
var interaction_1 = __importDefault(require("./queries/interaction"));
var fs_1 = __importDefault(require("fs"));
var smartweave_1 = require("smartweave");
var communities_1 = __importDefault(require("./queries/communities"));
var client = new arweave_1["default"]({
    host: "arweave.net",
    port: 443,
    protocol: "https"
});
var fetchCache = function (contract) { return __awaiter(void 0, void 0, void 0, function () {
    var res, _a, _b, edge, latestInteraction, content, cache, res_1, res_2;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = ar_gql_1.run;
                _b = [interaction_1["default"]];
                _c = {
                    contract: contract
                };
                return [4 /*yield*/, client.network.getInfo()];
            case 1: return [4 /*yield*/, _a.apply(void 0, _b.concat([(_c.block = (_d.sent()).height,
                        _c)]))];
            case 2:
                res = _d.sent();
                edge = res.data.transactions.edges[0];
                latestInteraction = edge ? edge.node.id : "";
                try {
                    res_1 = fs_1["default"].readFileSync("./cache/" + contract + ".json").toString();
                    content = JSON.parse(res_1);
                    cache = content[contract];
                }
                catch (_e) { }
                if (!(cache && cache.interaction === latestInteraction)) return [3 /*break*/, 3];
                return [2 /*return*/, cache.res];
            case 3: return [4 /*yield*/, smartweave_1.readContract(client, contract, undefined, true)];
            case 4:
                res_2 = _d.sent();
                try {
                    fs_1["default"].mkdirSync("./cache");
                }
                catch (_f) { }
                fs_1["default"].writeFileSync("./cache/" + contract + ".json", JSON.stringify({ interaction: latestInteraction, res: res_2 }));
                return [2 /*return*/, res_2];
        }
    });
}); };
exports.fetchCache = fetchCache;
var cacheCommunities = function () { return __awaiter(void 0, void 0, void 0, function () {
    var res, communities, _i, res_3, edge, id;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, ar_gql_1.all(communities_1["default"])];
            case 1:
                res = _a.sent();
                communities = [];
                _i = 0, res_3 = res;
                _a.label = 2;
            case 2:
                if (!(_i < res_3.length)) return [3 /*break*/, 5];
                edge = res_3[_i];
                id = edge.node.id;
                return [4 /*yield*/, exports.fetchCache(id)];
            case 3:
                _a.sent();
                communities.push(id);
                _a.label = 4;
            case 4:
                _i++;
                return [3 /*break*/, 2];
            case 5:
                fs_1["default"].writeFileSync("./cache/communities.json", JSON.stringify(communities));
                return [2 /*return*/];
        }
    });
}); };
exports.cacheCommunities = cacheCommunities;
var fetchCommunities = function () { return __awaiter(void 0, void 0, void 0, function () {
    var main, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                main = function () { return __awaiter(void 0, void 0, void 0, function () {
                    var communities, res, _i, communities_2, id, cache;
                    return __generator(this, function (_a) {
                        communities = JSON.parse(fs_1["default"].readFileSync("./cache/communities.json").toString());
                        res = [];
                        for (_i = 0, communities_2 = communities; _i < communities_2.length; _i++) {
                            id = communities_2[_i];
                            cache = JSON.parse(fs_1["default"].readFileSync("./cache/" + id + ".json").toString());
                            res.push(__assign({ id: id }, cache.res));
                        }
                        return [2 /*return*/, res];
                    });
                }); };
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 6]);
                return [4 /*yield*/, main()];
            case 2: return [2 /*return*/, _b.sent()];
            case 3:
                _a = _b.sent();
                return [4 /*yield*/, exports.cacheCommunities()];
            case 4:
                _b.sent();
                return [4 /*yield*/, main()];
            case 5: return [2 /*return*/, _b.sent()];
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.fetchCommunities = fetchCommunities;
