﻿/**
 * @file
 * 機率水池模組
 * @author DanielFeng
 */
#include <node.h>
#include <stdlib.h>     /* srand, rand */
#include <time.h>       /* time */

#include "randBuf.h"
#include "randBufParameter.c"

/** for NodeJS interface */
using namespace v8;

//public variable
/** 連線獎項累積分數 */
YZ_BUF_DATA serverLinkBuf;
/** 連線獎項門檻 */
YZ_BUF_DATA linkBufThreshold;
/** 連項獎項Y資訊 */
YZ_PRIZE_INFO yPrizeRecord;
/** 連項獎項JP資訊 */
YZ_PRIZE_INFO jpPrizeRecord;
/** 連線Jp的分數,主機使用 */
double serverJpScore[MAX_Z_BUFFER];
/** 連線JP的起始分數 */
double serverJpBase[MAX_Z_BUFFER];
/** 連線JP的上限分數 */
double serverJpMax[MAX_Z_BUFFER];
/** 系統設定JP的上限分數 */
double jpMaxSetScore[MAX_Z_BUFFER];
/** 上線分機數量 */
u8 aliveClientCount;
/** 上線分機資訊 */
CLIENT_LINK_INFO_ST clientInfo[MAX_CLIENT_NUM];
/** 連線獎項serial number */
u8 linkPrizeSerial;
/** 最大押注 */
u32 setupMaxBet;

//private functions & variables
static void Rand_nativeJPBufProcess(int nativeScore);
static void Rand_getJPMaxScore(int jpIdx);
static void Rand_setBigPrizeThreshold(int idx, int betIdx);
static u8 Rand_getLinkPrizeClientIdx(CLIENT_LINK_INFO_ST *pClientInfo, int count, int prizeIdx);

/** x, y水池設定值的變數 */
static const BUFFER_SETTING* randBuf = (BUFFER_SETTING*)randBufParameter;
/** 水池小數設定值的變數 */
static const BUFFER_FLOATING_SETTING* randBufFloat = (BUFFER_FLOATING_SETTING*)randBufDoubleParameter;

/** 
* 初始化水池設定值, 將相關數值從JS設定
*/
void Rand_initBufSetting(const FunctionCallbackInfo<Value>& args)
{
    int errorArg = 0;
    int i, j;
    char *errmsg[] = {
        "NoError","yBuf", "yBufThreshold", "zBuf", "zBufThreshold", "jpScore", "jpBase",
        "jpMax", "jpMaxSet", "prizeSerial", "MaxBet"
    };
    char msg[64];
    Local<Number> num;
    Isolate* isolate = args.GetIsolate();
    Local<Object> obj = Local<Object>::Cast(args[0]);
    Local<Array> yBuf, yBufThreshold, zBuf, zBufThreshold, jpScore, jpBase, jpMax, jpMaxSet;
    Local<Value> prizeSerial, MaxBet;

    //針對輸入參數進行錯誤判斷,判斷傳入的物件是否有相關的成員變數
    if (obj->Has(String::NewFromUtf8(isolate, "yBuf"))) {
        yBuf = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "yBuf")));
        if (!yBuf->IsArray()) errorArg = 1;
    } else {
        errorArg = 1;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "yBufThreshold"))) {
        yBufThreshold = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "yBufThreshold")));
        if (!yBufThreshold->IsArray()) errorArg = 2;
    } else {
        errorArg = 2;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "zBuf"))) {
        zBuf = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "zBuf")));
        if (!zBuf->IsArray()) errorArg = 3;
    } else {
        errorArg = 3;
    }
    
    if (obj->Has(String::NewFromUtf8(isolate, "zBufThreshold"))) {
        zBufThreshold = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "zBufThreshold")));
        if (!zBufThreshold->IsArray()) errorArg = 4;
    } else {
        errorArg = 4;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "jpScore"))) {
        jpScore = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "jpScore")));
        if (!jpScore->IsArray()) errorArg = 5;
    } else {
        errorArg = 5;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "jpBase"))) {
        jpBase = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "jpBase")));
        if (!jpBase->IsArray()) errorArg = 6;
    } else {
        errorArg = 6;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "jpMax"))) {
        jpMax = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "jpMax")));
        if (!jpMax->IsArray()) errorArg = 7;
    } else {
        errorArg = 7;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "jpMaxSet"))) {
        jpMaxSet = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "jpMaxSet")));
        if (!jpMaxSet->IsArray()) errorArg = 8;
    } else {
        errorArg = 8;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "prizeSerial"))) {
        prizeSerial = obj->Get(String::NewFromUtf8(isolate, "prizeSerial"));
        if (!prizeSerial->IsUint32()) errorArg = 9;
    } else {
        errorArg = 9;
    }
    
    if (obj->Has(String::NewFromUtf8(isolate, "MaxBet"))) {
        MaxBet = obj->Get(String::NewFromUtf8(isolate, "MaxBet"));
        if (!MaxBet->IsUint32()) errorArg = 10;
    } else {
        errorArg = 10;
    }

    if (errorArg > 0) {
        if (errorArg < 9) {
            sprintf(msg, "obj not has %s array member", errmsg[errorArg]);
        } else {
            sprintf(msg, "obj not has %s member", errmsg[errorArg]);
        }
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
        return;
    }

    memset(&serverLinkBuf, 0, sizeof(serverLinkBuf));
    memset(&linkBufThreshold, 0, sizeof(linkBufThreshold));
    memset(&serverJpScore[0], 0, sizeof(serverJpScore));
    memset(&serverJpBase[0], 0, sizeof(serverJpBase));
    memset(&serverJpMax[0], 0, sizeof(serverJpMax));
    memset(&jpMaxSetScore[0], 0, sizeof(jpMaxSetScore));
    memset(&yPrizeRecord, 0, sizeof(yPrizeRecord));
    memset(&jpPrizeRecord, 0, sizeof(jpPrizeRecord));
    aliveClientCount = 0;
    memset(&clientInfo[0], 0, sizeof(clientInfo));

    //從JS讀取最大押注
    setupMaxBet = MaxBet->Uint32Value();

    //從JS讀取Y水池的累積數值與門檻數值
    for (i = 0; i < MAX_BET_LEVEL_COUNT; i++) {
        for (j = 0; j < MAX_Y_BUFFER; j++) {
            if (yBuf->Get(i*MAX_Y_BUFFER+j)->IsNumber()) {
                serverLinkBuf.yBuf[i][j] = yBuf->Get(i*MAX_Y_BUFFER+j)->NumberValue();
            } else {
                sprintf(msg, "yBuf array[%d] is not double", i*MAX_Y_BUFFER+j);
                isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
                return;
            }
            
            if (yBufThreshold->Get(i*MAX_Y_BUFFER+j)->IsNumber()) {
                linkBufThreshold.yBuf[i][j] = yBufThreshold->Get(i*MAX_Y_BUFFER+j)->NumberValue();
            } else {
                sprintf(msg, "yBufThreshold array[%d] is not double", i*MAX_Y_BUFFER+j);
                isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
                return;
            }
            

            //判斷Y水池的門檻值是否為0, 如果為0設定門檻數值
            if (linkBufThreshold.yBuf[i][j] == 0) {
                Rand_setBigPrizeThreshold(LINK_PRIZE_Y1+j, i);
                Local<Number> num = Number::New(isolate, linkBufThreshold.yBuf[i][j]);
                yBufThreshold->Set(i*MAX_Y_BUFFER+j, num);
            }
        }
    }
    
    //從JS讀取Z水池的累積數值與門檻數值與JP相關設定數值
    for (i = 0; i < MAX_Z_BUFFER; i++) {
        if (zBuf->Get(i)->IsNumber()) {
            serverLinkBuf.zBuf[i] = zBuf->Get(i)->NumberValue();
        } else {
            sprintf(msg, "zBuf array[%d] is not double", i);
            isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
            return;
        }

        if (zBufThreshold->Get(i)->IsNumber()) {
            linkBufThreshold.zBuf[i] = zBufThreshold->Get(i)->NumberValue();
        } else {
            sprintf(msg, "zBufThreshold array[%d] is not double", i);
            isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
            return;
        }
        
        if (jpScore->Get(i)->IsNumber()) {
            serverJpScore[i] = jpScore->Get(i)->NumberValue();
        } else {
            sprintf(msg, "jpScore array[%d] is not double", i);
            isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
            return;
        }

        if (jpBase->Get(i)->IsNumber()) {
            serverJpBase[i] = jpBase->Get(i)->NumberValue();
        } else {
            sprintf(msg, "jpBase array[%d] is not double", i);
            isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
            return;
        }
        
        if (jpMax->Get(i)->IsNumber()) {
            serverJpMax[i] = jpMax->Get(i)->NumberValue();
        } else {
            sprintf(msg, "jpMax array[%d] is not double", i);
            isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
            return;
        }
        
        if (jpMaxSet->Get(i)->IsNumber()) {
            jpMaxSetScore[i] = jpMaxSet->Get(i)->NumberValue();
        } else {
            sprintf(msg, "jpMaxSet array[%d] is not double", i);
            isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
            return;
        }
        
        //判斷JP的起始分數是否為0
        if (serverJpBase[i] == 0) {
            const double default_jp_base[MAX_Z_BUFFER] = {JP1_BASE_SCORE, JP2_BASE_SCORE, JP3_BASE_SCORE};
            serverJpBase[i] = default_jp_base[i];
            Local<Number> num = Number::New(isolate, serverJpBase[i]);
            jpBase->Set(i, num);
        }
        //判斷目前JP分數是否為0
        if (serverJpScore[i] == 0) {
            serverJpScore[i] = serverJpBase[i];
            Local<Number> num = Number::New(isolate, serverJpScore[i]);
            jpScore->Set(i, num);
        }
        //判斷JP水池門檻是否為0
        if (linkBufThreshold.zBuf[i] == 0) {
            Rand_setBigPrizeThreshold(i, 0);
            Local<Number> num = Number::New(isolate, linkBufThreshold.zBuf[i]);
            zBufThreshold->Set(i, num);
        }
    }

    //從JS讀取獎項序號
    linkPrizeSerial = prizeSerial->Uint32Value();
}

/**
* 檢查連線水池的獎項
* @param pClientInfo 機台資訊的陣列指標
* @param count 陣列的個數
*/
void Rand_checkLinkPrize(const FunctionCallbackInfo<Value>& args)
{
    static u8 check_idx = 0;
    int i, j, machine_idx, prizeIdx, flag;
    CLIENT_LINK_INFO_ST *pClientInfo = &clientInfo[0];
    int count = 0;
    char msg[128];
    int errorArg = 0;
    char *errorMsg[] = {
        "NoError", "linkPrizeCount", "credit", "totalProfit", "addToLinkBuf", "linkState"
    };
    Isolate* isolate = args.GetIsolate();
    Local<Object> obj = Local<Object>::Cast(args[0]);
    Local<Array> arg1, arg2, arg3, arg4, arg5;

    //針對輸入參數進行錯誤判斷,判斷傳入的物件是否有相關的成員變數
    if (obj->Has(String::NewFromUtf8(isolate, "linkPrizeCount"))) {
        arg1 = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "linkPrizeCount")));
        if (!arg1->IsArray()) errorArg = 1;
    } else {
        errorArg = 1;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "credit"))) {
        arg2 = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "credit")));
        if (!arg2->IsArray()) errorArg = 2;
    } else {
        errorArg = 2;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "totalProfit"))) {
        arg3 = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "totalProfit")));
        if (!arg3->IsArray()) errorArg = 3;
    } else {
        errorArg = 3;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "addToLinkBuf"))) {
        arg4 = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "addToLinkBuf")));
        if (!arg4->IsArray()) errorArg = 4;
    } else {
        errorArg = 4;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "linkState"))) {
        arg5 = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "linkState")));
        if (!arg5->IsArray()) errorArg = 5;
    } else {
        errorArg = 5;
    }

    if (errorArg > 0) {
        sprintf(msg, "obj not has %s array member", errorMsg[errorArg]);
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
        return;
    }
        
    for (i = 0; i < MAX_CLIENT_NUM; i++) {
        if (arg5->Get(i)->Uint32Value() > 0) {
            clientInfo[i].clientIdx = i + 1;
            if (arg1->Get(i)->IsUint32()) {
                clientInfo[i].linkPrizeCount = arg1->Get(i)->Uint32Value();
            } else {
                sprintf(msg, "linkPrizeCount array[%d] is not uint32", i);
                isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
                return;
            }
            if (arg2->Get(i)->IsUint32()) {
                clientInfo[i].credit = arg2->Get(i)->Uint32Value();
            } else {
                sprintf(msg, "credit array[%d] is not uint32", i);
                isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
                return;
            }
            if (arg3->Get(i)->IsNumber()) {
                clientInfo[i].totalProfit = arg3->Get(i)->NumberValue();
            } else {
                sprintf(msg, "totalProfit array[%d] is not double", i);
                isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
                return;
            }
            if (arg4->Get(i)->IsNumber()) {
                clientInfo[i].addToLinkBuf = arg4->Get(i)->NumberValue();
            } else {
                sprintf(msg, "addToLinkBuf array[%d] is not double", i);
                isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
                return;
            }
            count++;
        }
    }

    if (count == 0) return;
        
    if (jpPrizeRecord.flag == 0) {
        for (i = LINK_PRIZE_JP1; i <= LINK_PRIZE_JP3; i++) {
            prizeIdx = check_idx;
            check_idx++;
            check_idx %= (LINK_PRIZE_JP3+1);

            //判斷畫面上的jp分數是否已到達累積上限 or JP水池累積分數超過畫面JP分數
            if (((serverJpMax[prizeIdx] != 0) && 
                (serverJpScore[prizeIdx] >= serverJpMax[prizeIdx])) ||
                (serverLinkBuf.zBuf[prizeIdx] >= linkBufThreshold.zBuf[prizeIdx])) {
                
                machine_idx = Rand_getLinkPrizeClientIdx(pClientInfo, count, prizeIdx);
                
                if (machine_idx != 0xFF) {
                    jpPrizeRecord.flag = 1;
                    jpPrizeRecord.type = prizeIdx;
                    jpPrizeRecord.betIdx = 0;
                    jpPrizeRecord.clientIdx = machine_idx;
                    jpPrizeRecord.serial = ++linkPrizeSerial;
                    jpPrizeRecord.score = serverJpScore[prizeIdx];
                    jpPrizeRecord.timeCount = LINKING_PRIZE_RESPONSE_TIME_OUT;
                    //重新選取上限值
                    Rand_getJPMaxScore(prizeIdx);
                }

                break;
            }
        }

        if (yPrizeRecord.flag == FALSE) {
            for (i = 0; i < MAX_Y_BUFFER; i++) {
                prizeIdx = i+LINK_PRIZE_Y1;
                flag = FALSE;

                for (j = 0; j < MAX_BET_LEVEL_COUNT; j++) {
                    if (serverLinkBuf.yBuf[j][i] >= linkBufThreshold.yBuf[j][i]) {
                        machine_idx = Rand_getLinkPrizeClientIdx(pClientInfo, count, prizeIdx);

                        if (machine_idx != 0xFF)
                        {
                            yPrizeRecord.flag = TRUE;
                            yPrizeRecord.type = prizeIdx;
                            yPrizeRecord.betIdx = j;
                            yPrizeRecord.clientIdx = machine_idx;
                            yPrizeRecord.serial = ++linkPrizeSerial;
                            yPrizeRecord.score = linkBufThreshold.yBuf[j][i];
                            yPrizeRecord.timeCount = LINKING_PRIZE_RESPONSE_TIME_OUT;
                        }

                        flag = TRUE;
                        break;
                    }
                }

                if (flag == TRUE) {
                    break;
                }
            }
        }
    }
}

/**
* 主機增減水池的分數
* @param data 增減水池的分數
*/
void Rand_serverAddYZBuf(const FunctionCallbackInfo<Value>& args)
{
    int i, j, errorArg = 0;
    double tmp_y_buffer, tmp_z_buffer, orig_score, tmp_score, tmp_rate;
    u32 diffValue;
    u8 jp_less_zero, data_wrong;
    YZ_BUF_DATA data;
    char msg[128];

    Isolate* isolate = args.GetIsolate();
    Local<Object> obj = Local<Object>::Cast(args[0]);
    Local<Array> yBuf, zBuf;
    
    //針對輸入參數進行錯誤判斷,判斷傳入的物件是否有相關的成員變數
    if (obj->Has(String::NewFromUtf8(isolate, "yBuf"))) {
        yBuf = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "yBuf")));
        if (!yBuf->IsArray()) errorArg = 1;
    } else {
        errorArg = 1;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "zBuf"))) {
        zBuf = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "zBuf")));
        if (!zBuf->IsArray()) errorArg = 2;
    } else {
        errorArg = 2;
    }

    if (errorArg > 0) {
        sprintf(msg, "obj not has %s array member", (errorArg == 1)? "yBuf":"zBuf");
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
        return;
    }

    memset(&data, 0, sizeof(data));
    //從JS讀取Y水池的累積數值
    for (i = 0; i < MAX_BET_LEVEL_COUNT; i++) {
        for (j = 0; j < MAX_Y_BUFFER; j++) {
            if (yBuf->Get(i*MAX_Y_BUFFER+j)->IsNumber()) {
                data.yBuf[i][j] = yBuf->Get(i*MAX_Y_BUFFER+j)->NumberValue();
            } else {
                sprintf(msg, "yBuf array[%d] is not double", i*MAX_Y_BUFFER+j);
                isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
                return;
            }
        }
    }
    //從JS讀取Z水池的累積數值
    for (i = 0; i < MAX_Z_BUFFER; i++) {
        if (zBuf->Get(i)->IsNumber()) {
            data.zBuf[i] = zBuf->Get(i)->NumberValue();
        } else {
            sprintf(msg, "zBuf array[%d] is not double", i);
            isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
            return;
        }
    }

    tmp_y_buffer = 0;
    tmp_z_buffer = 0;
    jp_less_zero = FALSE;

    for (i = 0; i < MAX_Z_BUFFER; i++) {
        if (serverLinkBuf.zBuf[i] < 0) {
            jp_less_zero = TRUE;
            break;
        }
    }

    data_wrong = FALSE;

    //檢查Z水池增加分數的比例是否正確
    tmp_rate = (randBufFloat->bufAddRatioPositive[2]*randBufFloat->zBufAddRatio[0]);

    if (tmp_rate > 0) {
        orig_score = data.zBuf[0] / tmp_rate;

        for (i = 0; i < 2; i++) {
            tmp_rate = (randBufFloat->bufAddRatioPositive[2]*randBufFloat->zBufAddRatio[i+1]);
            if (tmp_rate > 0) {
                tmp_score = (double)data.zBuf[i+1] / tmp_rate;
                diffValue = Rand_toU32(tmp_score - orig_score);
                if (diffValue != 0) {
                    data_wrong = TRUE;
                }
            }
        }
    }

    if (data_wrong == FALSE) {
        for (i = 0; i < MAX_Z_BUFFER; i++) {
            serverLinkBuf.zBuf[i] += data.zBuf[i];
            tmp_z_buffer += data.zBuf[i];
        }
    }

    for (i = 0; i < MAX_BET_LEVEL_COUNT; i++) {
        for (j = 0; j < MAX_Y_BUFFER; j++) {
            serverLinkBuf.yBuf[i][j] += data.yBuf[i][j];
            tmp_y_buffer += data.yBuf[i][j];
        }
    }
}

/**
* 當分機已開出大獎或放棄開獎時,使用此函式清除大獎資訊
* @param status 獎項狀態(FALSE:放棄,TRUE:拉走)
*/
void Rand_resetYPrize(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    u8 status;

    if (!args[0]->IsUint32()) {
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "argument is not uint32")));
        return;
    }

    status = args[0]->Uint32Value();

    if (yPrizeRecord.flag != FALSE) {
        if ((yPrizeRecord.type >= LINK_PRIZE_Y1) && 
            (yPrizeRecord.type <= LINK_PRIZE_Y4) && (status == TRUE)) {
            Rand_setBigPrizeThreshold(yPrizeRecord.type, yPrizeRecord.betIdx);
            serverLinkBuf.yBuf[yPrizeRecord.betIdx][yPrizeRecord.type-LINK_PRIZE_Y1] -= yPrizeRecord.score;
        }
        
        memset(&yPrizeRecord, 0, sizeof(yPrizeRecord));
    }
}

/**
* 當分機已開出JP或放棄開JP時,使用此函式清除JP資訊
* @param idx 獎項索引
* @param status 獎項狀態(FALSE:放棄,TRUE:拉走)
* @param score 分數(實際中獎的分數)
*/
void Rand_resetJPPrize(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    u8 idx, status;
    double score;

    if (args.Length() != 3) {
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "Wrong number of arguments")));
        return;
    }

    if (!args[0]->IsUint32()) {
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "argument 1 is not uint32")));
        return;
    }

    if (!args[1]->IsUint32()) {
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "argument 2 is not uint32")));
        return;
    }

    if (!args[2]->IsNumber()) {
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "argument 3 is not double")));
        return;
    }

    idx = args[0]->Uint32Value();
    status = args[1]->Uint32Value();
    score = args[2]->NumberValue();

    if ((idx <= LINK_PRIZE_JP3) && (status == TRUE)) {
        Rand_setBigPrizeThreshold(idx, 0);

        if (serverLinkBuf.zBuf[idx] < score) {
            Rand_nativeJPBufProcess(score - serverLinkBuf.zBuf[idx]);
            serverLinkBuf.zBuf[idx] = 0;
        } else {
            serverLinkBuf.zBuf[idx] -= score;
        }
    }

    if (jpPrizeRecord.flag != 0) {
        memset(&jpPrizeRecord, 0, sizeof(jpPrizeRecord));
    }
}

/**
* 當分機已拉中JP,使用此函式重置JP分數
* @param idx 獎項索引
*/
void Rand_resetJPScore(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    u8 idx;
    const double default_jp_base[MAX_Z_BUFFER] = {JP1_BASE_SCORE, JP2_BASE_SCORE, JP3_BASE_SCORE};

    if (!args[0]->IsUint32()) {
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "argument is not uint32")));
        return;
    }

    idx = args[0]->Uint32Value();

    if (idx < MAX_Z_BUFFER) {
        if (serverJpBase[idx] == 0) {
            serverJpBase[idx] = default_jp_base[idx];
        }

        serverJpScore[idx] = serverJpBase[idx];
        Rand_setBigPrizeThreshold(idx, 0);
    }
}

/**
* 設定JP累積上限
* @param jpIdx JP索引
* @param score 上限分數
*/
void Rand_setJPMaxScore(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    u8 jpIdx;
    double score;

    if (args.Length() != 2) {
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "Wrong number of arguments")));
        return;
    }

    if (!args[0]->IsUint32()) {
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "argument 1 is not uint32")));
        return;
    }

    if (!args[1]->IsNumber()) {
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "argument 2 is not double")));
        return;
    }

    jpIdx = args[0]->Uint32Value();
    score = args[1]->NumberValue();

    jpMaxSetScore[jpIdx] = score;
    Rand_getJPMaxScore(jpIdx);
}

/**
* 設定JP起始分數
* @param idx JP索引
* @param score JP起始分數
*/
void Rand_setJPBaseScore(const FunctionCallbackInfo<Value>& args)
{
    const u32 default_jp_base[MAX_Z_BUFFER] = {JP1_BASE_SCORE, JP2_BASE_SCORE, JP3_BASE_SCORE};
    Isolate* isolate = args.GetIsolate();
    u8 idx;
    double score;
    
    if (args.Length() != 2) {
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "Wrong number of arguments")));
        return;
    }

    if (!args[0]->IsUint32()) {
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "argument 1 is not uint32")));
        return;
    }

    if (!args[1]->IsNumber()) {
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "argument 2 is not double")));
        return;
    }

    idx = args[0]->Uint32Value();
    score = args[1]->NumberValue();

    if (idx < MAX_Z_BUFFER) {
        if (score == 0) {
            serverJpBase[idx] = default_jp_base[idx];
        } else {
            serverJpBase[idx] = score;
        }

        serverJpScore[idx] = serverJpBase[idx];
        Rand_setBigPrizeThreshold(idx, 0);
    }
}

/**
* 主機增加JP的分數
* @param ptrJP 要增加的JP pointer
*/
void Rand_serverAddJPScore(const FunctionCallbackInfo<Value>& args)
{
    int i;
    char msg[128];

    Isolate* isolate = args.GetIsolate();
    Local<Array> jpScore = Local<Array>::Cast(args[0]);

    if (!jpScore->IsArray()) {
        sprintf(msg, "argument is not double array");
           isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
        return;
    }

    for (i = 0; i < MAX_Z_BUFFER; i++) {
        if (!jpScore->Get(i)->IsNumber()) {
            sprintf(msg, "array[%d] is not double value", i);
            isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
            return;
        }
        serverJpScore[i] += jpScore->Get(i)->NumberValue();
        //jp的開放條件就是當水池積分大於畫面顯示的分數
        linkBufThreshold.zBuf[i] = serverJpScore[i];
    }
}

/**
* 設定機率模組的最大押注
*/
void Rand_setMaxBet(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();

    if (args[0]->IsUint32() == true) {
        setupMaxBet = args[0]->Uint32Value();
    } else {
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "argument is not uint32 value")));
    }
}

/**
* 將水池相關變數從C內部更新至JS
*/
void Rand_updateBufValue(const FunctionCallbackInfo<Value>& args)
{
    int errorArg = 0;
    int i, j;
    char *errmsg[] = {
        "NoError","yBuf", "yBufThreshold", "zBuf", "zBufThreshold", "jpScore", "jpBase",
        "jpMax", "jpMaxSet", "prizeSerial"
    };
    char msg[64];
    Local<Number> num;
    Isolate* isolate = args.GetIsolate();
    Local<Object> obj = Local<Object>::Cast(args[0]);
    Local<Array> yBuf, yBufThreshold, zBuf, zBufThreshold, jpScore, jpBase, jpMax, jpMaxSet;
    Local<Value> prizeSerial;
    
    //針對輸入參數進行錯誤判斷,判斷傳入的物件是否有相關的成員變數
    if (obj->Has(String::NewFromUtf8(isolate, "yBuf"))) {
        yBuf = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "yBuf")));
        if (!yBuf->IsArray()) errorArg = 1;
    } else {
        errorArg = 1;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "yBufThreshold"))) {
        yBufThreshold = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "yBufThreshold")));
        if (!yBufThreshold->IsArray()) errorArg = 2;
    } else {
        errorArg = 2;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "zBuf"))) {
        zBuf = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "zBuf")));
        if (!zBuf->IsArray()) errorArg = 3;
    } else {
        errorArg = 3;
    }
    
    if (obj->Has(String::NewFromUtf8(isolate, "zBufThreshold"))) {
        zBufThreshold = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "zBufThreshold")));
        if (!zBufThreshold->IsArray()) errorArg = 4;
    } else {
        errorArg = 4;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "jpScore"))) {
        jpScore = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "jpScore")));
        if (!jpScore->IsArray()) errorArg = 5;
    } else {
        errorArg = 5;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "jpBase"))) {
        jpBase = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "jpBase")));
        if (!jpBase->IsArray()) errorArg = 6;
    } else {
        errorArg = 6;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "jpMax"))) {
        jpMax = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "jpMax")));
        if (!jpMax->IsArray()) errorArg = 7;
    } else {
        errorArg = 7;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "jpMaxSet"))) {
        jpMaxSet = Local<Array>::Cast(obj->Get(String::NewFromUtf8(isolate, "jpMaxSet")));
        if (!jpMaxSet->IsArray()) errorArg = 8;
    } else {
        errorArg = 8;
    }

    if (obj->Has(String::NewFromUtf8(isolate, "prizeSerial"))) {
        prizeSerial = obj->Get(String::NewFromUtf8(isolate, "prizeSerial"));
        if (!prizeSerial->IsUint32()) errorArg = 9;
    } else {
        errorArg = 9;
    }
    
    if (errorArg > 0) {
        sprintf(msg, "obj not has %s array member", errmsg[errorArg]);
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, msg)));
        return;
    }

    for (i = 0; i < MAX_BET_LEVEL_COUNT; i++) {
        for (j = 0; j < MAX_Y_BUFFER; j++) {
            num = Number::New(isolate, serverLinkBuf.yBuf[i][j]);
            yBuf->Set(i*MAX_Y_BUFFER+j, num);
            num = Number::New(isolate, linkBufThreshold.yBuf[i][j]);
            yBufThreshold->Set(i*MAX_Y_BUFFER+j, num);
        }
    }

    for (i = 0; i < MAX_Z_BUFFER; i++) {
        num = Number::New(isolate, serverLinkBuf.zBuf[i]);
        zBuf->Set(i, num);
        num = Number::New(isolate, linkBufThreshold.zBuf[i]);
        zBufThreshold->Set(i, num);
        num = Number::New(isolate, serverJpScore[i]);
        jpScore->Set(i, num);
        num = Number::New(isolate, serverJpBase[i]);
        jpBase->Set(i, num);
        num = Number::New(isolate, serverJpMax[i]);
        jpMax->Set(i, num);
        num = Number::New(isolate, jpMaxSetScore[i]);
        jpMaxSet->Set(i, num);
    }
    
    num = Number::New(isolate, linkPrizeSerial);
    obj->Set(String::NewFromUtf8(isolate, "prizeSerial"), num);
}

/**
* 給JS判斷是否有JP獎項
*/
void Rand_updateJpPrize(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Local<Object> obj = Object::New(isolate);
    Local<Value> num;
    
    if (args[0]->IsUint32() == true) {
        jpPrizeRecord.flag = args[0]->Uint32Value();
    }
    
    num = Number::New(isolate, jpPrizeRecord.flag);
    obj->Set(String::NewFromUtf8(isolate, "flag"), num);

    if (jpPrizeRecord.flag != 0) {
        num = Number::New(isolate, jpPrizeRecord.type);
        obj->Set(String::NewFromUtf8(isolate, "type"), num);
        num = Number::New(isolate, jpPrizeRecord.betIdx);
        obj->Set(String::NewFromUtf8(isolate, "betIdx"), num);
        num = Number::New(isolate, jpPrizeRecord.clientIdx);
        obj->Set(String::NewFromUtf8(isolate, "clientIdx"), num);
        num = Number::New(isolate, jpPrizeRecord.serial);
        obj->Set(String::NewFromUtf8(isolate, "serial"), num);
        num = Number::New(isolate, jpPrizeRecord.score);
        obj->Set(String::NewFromUtf8(isolate, "score"), num);
        num = Number::New(isolate, jpPrizeRecord.timeCount);
        obj->Set(String::NewFromUtf8(isolate, "timeCount"), num);
    }

    args.GetReturnValue().Set(obj);
}

/**
* 給JS判斷是否有Y獎項
*/
void Rand_updateYPrize(const FunctionCallbackInfo<Value>& args)
{
    Isolate* isolate = args.GetIsolate();
    Local<Object> obj = Object::New(isolate);
    Local<Value> num;

    num = Number::New(isolate, yPrizeRecord.flag);
    obj->Set(String::NewFromUtf8(isolate, "flag"), num);

    if (yPrizeRecord.flag == TRUE) {
        num = Number::New(isolate, yPrizeRecord.type);
        obj->Set(String::NewFromUtf8(isolate, "type"), num);
        num = Number::New(isolate, yPrizeRecord.betIdx);
        obj->Set(String::NewFromUtf8(isolate, "betIdx"), num);
        num = Number::New(isolate, yPrizeRecord.clientIdx);
        obj->Set(String::NewFromUtf8(isolate, "clientIdx"), num);
        num = Number::New(isolate, yPrizeRecord.serial);
        obj->Set(String::NewFromUtf8(isolate, "serial"), num);
        num = Number::New(isolate, yPrizeRecord.score);
        obj->Set(String::NewFromUtf8(isolate, "score"), num);
        num = Number::New(isolate, yPrizeRecord.timeCount);
        obj->Set(String::NewFromUtf8(isolate, "timeCount"), num);
    }

    args.GetReturnValue().Set(obj);
}

/**
* 分機連線獎項timeout判斷
* @param time 經過時間(2.5ms = 1)
*/
void Rand_checkLinkPrizeTimeout(const FunctionCallbackInfo<Value>& args)
{
    u8 i, j;
    u32 time;
    Isolate* isolate = args.GetIsolate();

    if (args[0]->IsUint32() == true) {
        time = args[0]->Uint32Value();
    } else {
        isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate, "argument is not uint32 value")));
        return;
    }

    //判斷連線獎項指定的分機是否接收逾時
    if (yPrizeRecord.timeCount > time) {
        yPrizeRecord.timeCount -= time;
    } else {
        yPrizeRecord.timeCount = 0;
        memset(&yPrizeRecord, 0, sizeof(yPrizeRecord));
    }

    if (jpPrizeRecord.flag == 1) {
        if (jpPrizeRecord.timeCount > time) {
            jpPrizeRecord.timeCount -= time;
        } else {
            jpPrizeRecord.timeCount = 0;
            memset(&jpPrizeRecord, 0, sizeof(jpPrizeRecord));
        }
    }
}

/**
* 當JP獎項釋放時,JP水池為負值狀態下的處置
* @param nativeScore JP拉下後負的分數
*/
static void Rand_nativeJPBufProcess(int nativeScore)
{
    int betIdx, y_idx;
    int diffValue = nativeScore;
    int i, j, count;
    u32 whileCount = 0;

    //隨機從y水池中扣除分數
    while (diffValue > 0) {
        betIdx = rand()%MAX_BET_LEVEL_COUNT;
        y_idx = rand()%MAX_Y_BUFFER;

        if (serverLinkBuf.yBuf[betIdx][y_idx] > 0) {
            if (serverLinkBuf.yBuf[betIdx][y_idx] >= diffValue) {
                serverLinkBuf.yBuf[betIdx][y_idx] -= diffValue;
                diffValue = 0;
                break;
            } else {
                diffValue -= serverLinkBuf.yBuf[betIdx][y_idx];
                serverLinkBuf.yBuf[betIdx][y_idx] = 0;
            }
        }

        //檢查是否全部的y水池皆為0
        count = 0;

        for (i = 0; i < MAX_BET_LEVEL_COUNT; i++) {
            for (j = 0; j < MAX_Y_BUFFER; j++) {
                if (serverLinkBuf.yBuf[i][j] > 0) {
                    count++;
                }
            }
        }

        //y水池全部皆為0時,將分數扣除在JP1的水池
        if (count == 0) {
            serverLinkBuf.zBuf[0] -= diffValue;
            diffValue = 0;
            break;
        }

        whileCount++; if (whileCount > 100000) break;
    }
}

/**
* 取得JP累積上限的分數
* @param jpIdx JP索引
*/
static void Rand_getJPMaxScore(int jpIdx)
{
    int rand_num, diffValue;

    if (jpMaxSetScore[jpIdx] > 0) {
        rand_num = 1 + rand() % 10;
        diffValue = (jpMaxSetScore[jpIdx] * rand_num) / 100;

        if (diffValue > 0) {
            diffValue = rand() % diffValue;
        } else {
            diffValue = 0;
        }

        serverJpMax[jpIdx] = jpMaxSetScore[jpIdx] - diffValue;
    } else {
        serverJpMax[jpIdx] = 0;
    }
}

/**
* 設定JP & Y水池獎項的門檻分數
* @param idx 連線獎項的index
* @param betIdx 押注區間
*/
static void Rand_setBigPrizeThreshold(int idx, int betIdx)
{
    int multiIdx;
    double baseBet;

    baseBet = ((double)setupMaxBet*(double)randBuf->bufBetRatio[betIdx])/100.0;

    switch (idx) {
        case LINK_PRIZE_JP1:
        case LINK_PRIZE_JP2:
        case LINK_PRIZE_JP3:
            linkBufThreshold.zBuf[idx] = serverJpScore[idx];
            break;
        case LINK_PRIZE_Y1:
            multiIdx = Rand_checkTable(Rand_getElement(), (u16*)randBuf->yBufAMultiListRate, 10);
            linkBufThreshold.yBuf[betIdx][0] = baseBet*(double)randBuf->yBufAMultiList[multiIdx];
            break;
        case LINK_PRIZE_Y2:
            multiIdx = Rand_checkTable(Rand_getElement(), (u16*)randBuf->yBufBMultiListRate, 10);
            linkBufThreshold.yBuf[betIdx][1] = baseBet*(double)randBuf->yBufBMultiList[multiIdx];
            break;
        case LINK_PRIZE_Y3:
            multiIdx = Rand_checkTable(Rand_getElement(), (u16*)randBuf->yBufCMultiListRate, 10);
            linkBufThreshold.yBuf[betIdx][2] = baseBet*(double)randBuf->yBufCMultiList[multiIdx];
            break;
        case LINK_PRIZE_Y4:
            multiIdx = Rand_checkTable(Rand_getElement(), (u16*)randBuf->yBufDMultiListRate, 10);
            linkBufThreshold.yBuf[betIdx][3] = baseBet*(double)randBuf->yBufDMultiList[multiIdx];
            break;
      }
}

/**
* 根據營收決定大獎要給哪一台分機
* @param pClientInfo 機台資訊的陣列指標
* @param count 陣列的個數
* @param prizeIdx 獎項
* @returns 機台號碼
*/
static u8 Rand_getLinkPrizeClientIdx(CLIENT_LINK_INFO_ST *pClientInfo, int count, int prizeIdx)
{
    int i, j, rank_count, mode;
    CLIENT_LINK_INFO_ST tmp_machine_info;
    u16 rate[80];
    u16 total_rate;
    double score1, score2;
    int rate_list[3] = {400, 80, 32};

    memset(rate, 0, sizeof(rate));

    for (i = 0; i < count; i++) {
        for (j = i + 1; j < count; j++) {
            score1 = pClientInfo[j].totalProfit;
            score2 = pClientInfo[i].totalProfit;

            //盈餘貢獻由大排到小
            if (score1 > score2) {
                memcpy(&tmp_machine_info, &pClientInfo[j], sizeof(CLIENT_LINK_INFO_ST));
                memcpy(&pClientInfo[j], &pClientInfo[i], sizeof(CLIENT_LINK_INFO_ST));
                memcpy(&pClientInfo[i], &tmp_machine_info, sizeof(CLIENT_LINK_INFO_ST));
            }
        }
    }

    if (Rand_getElement() < 460) { 
        //90%的機率抽取前三名 0:400 1:80 2:32
        mode = 1;
    } else {
        //,10%亂數分配
        mode = 0;
    }

    //分配球數
    total_rate = 0;
    rank_count = 0;

    for (i = 0; i < count; i++) {
        //連線jp獎項只分配到有credit的機台
        if (prizeIdx <= LINK_PRIZE_JP3) {
            if (pClientInfo[i].credit > 0) {
                if (mode == 1) {
                    rate[i] = rate_list[rank_count];
                } else {
                    rate[i] = 8;
                }

                rank_count++;
            } else {
                rate[i] = 0;
            }
        } else {
            //連線y水池獎項只分配到佇列有空間的機台
            if (pClientInfo[i].linkPrizeCount < 5) {
                if (mode == 1) {
                    rate[i] = rate_list[rank_count];
                } else {
                  rate[i] = 8;
                }

                rank_count++;
            } else {
                rate[i] = 0;
            }
        }

        total_rate += rate[i];

        //當模式1的狀況下,設定完前三名的球數後即可跳出分配球數的迴圈
        if (rank_count == 3 && mode == 1) {
            break;
        }
    }
    
    if (total_rate == 0) {
        return 0xFF;
    } else {
        return pClientInfo[Rand_checkTable(Rand_getRandNum(total_rate), rate, count)].clientIdx;
    }
}

/** for NodeJS interface */
void init(Local<Object> exports) {
    srand(time(NULL));
    Rand_initRandNum();

    NODE_SET_METHOD(exports, "Rand_initBufSetting", Rand_initBufSetting);
    NODE_SET_METHOD(exports, "Rand_checkLinkPrize", Rand_checkLinkPrize);
    NODE_SET_METHOD(exports, "Rand_resetYPrize", Rand_resetYPrize);
    NODE_SET_METHOD(exports, "Rand_resetJPPrize", Rand_resetJPPrize);
    NODE_SET_METHOD(exports, "Rand_resetJPScore", Rand_resetJPScore);
    NODE_SET_METHOD(exports, "Rand_setJPMaxScore", Rand_setJPMaxScore);
    NODE_SET_METHOD(exports, "Rand_setJPBaseScore", Rand_setJPBaseScore);
    NODE_SET_METHOD(exports, "Rand_serverAddJPScore", Rand_serverAddJPScore);
    NODE_SET_METHOD(exports, "Rand_serverAddYZBuf", Rand_serverAddYZBuf);
    NODE_SET_METHOD(exports, "Rand_setMaxBet", Rand_setMaxBet);
    NODE_SET_METHOD(exports, "Rand_updateBufValue", Rand_updateBufValue);
    NODE_SET_METHOD(exports, "Rand_updateJpPrize", Rand_updateJpPrize);
    NODE_SET_METHOD(exports, "Rand_updateYPrize", Rand_updateYPrize);
    NODE_SET_METHOD(exports, "Rand_checkLinkPrizeTimeout", Rand_checkLinkPrizeTimeout);
}

NODE_MODULE(randBuf, init)