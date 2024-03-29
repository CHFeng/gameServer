﻿#ifndef _RAND_BUF_H_
#define _RAND_BUF_H_

#include "myTypes.h"
#include "randTool.h"

#define API_Printf printf

/** 押注區間總數 */
#define MAX_BET_LEVEL_COUNT 5
/** Y水池分類總數 */
#define MAX_Y_BUFFER 4
/** Z水池分類總數 JP1 JP2 JP3 */
#define MAX_Z_BUFFER 3
/** JP1 起始分數 */
#define JP1_BASE_SCORE (100000.00)
/** JP2 起始分數 */
#define JP2_BASE_SCORE (10000.00)
/** JP3 起始分數 */
#define JP3_BASE_SCORE (1000.00)
/** 連線獎項柱列長度 */
#define MAX_LINE_PRIZE_COUNT 5
/** 分機數量上限 */
#define MAX_CLIENT_NUM 100
/** 連線獎項回收時間,1/400為單位 */
#define LINKING_PRIZE_TIME_OUT (6*60*400)
/** 連線獎項等待回應時間,1/400為單位 */
#define LINKING_PRIZE_RESPONSE_TIME_OUT (30*400)

/** JP & Y水池獎項列舉 */
typedef enum
{
	LINK_PRIZE_JP1,
	LINK_PRIZE_JP2,
	LINK_PRIZE_JP3,
	LINK_PRIZE_Y1,
	LINK_PRIZE_Y2,
	LINK_PRIZE_Y3,
	LINK_PRIZE_Y4
} LINKING_PRIZE_EN;

/** Y&Z 水池累積分數 */
typedef struct
{
  	double yBuf[MAX_BET_LEVEL_COUNT][MAX_Y_BUFFER];
  	double zBuf[MAX_Z_BUFFER];
} YZ_BUF_DATA;

/** 分機連線資訊 */
typedef struct
{
	/** 機台編號 */
	u8 clientIdx;
	/** 連線獎項柱列中的獎項數量 */
	u8 linkPrizeCount;
	/** 台面分數 */
	u32 credit;
	/** 該分機總盈餘 */
	double totalProfit;
	/** 該分機貢獻至Y&Z水池的分數 */
	double addToLinkBuf;
} CLIENT_LINK_INFO_ST;

/** Y & Z獎項資訊結構 */
typedef struct
{
	/** 是否有大獎 */
	u8 flag;
	/** 獎項類別 */
	u8 type;
	/** 押注區間 */
	u8 betIdx;
	/** 哪一台中獎 */
	u8 clientIdx;
	/** 序號 */
	u8 serial;
	/** 獎項分數 */
	double score;
	/** 確認時間 */
	u32 timeCount;
} YZ_PRIZE_INFO;

/** 連線獎項結構 */
typedef struct
{
	/** y獎項類別 */
	u8 type;
	/** 押注區間 */
    u8 betIdx;
    /** 幾回合後釋放此獎項 */
	u8 rounds;
	/** timeout時間 */
	u32 time;
	/** 獎項分數 */
	double score;
} LINK_PRIZE_INFO;

/** x, y水池相關設定值 */
typedef struct
{
    /** 押注分數區間 */
    u16 bufBetRatio[MAX_BET_LEVEL_COUNT];
    /** X水池回分時的處理方式, 
        共有三種狀態 單機 狀態1(連線機台總數達50%) 狀態2:80% 
        0:單機開出 1:存回系統Y水池 */
    u16 xBufReleaseTypeRate[2];
    u16 xBufReleaseTypeRate_1[2];
    u16 xBufReleaseTypeRate_2[2];
    /** X水池回分時的處理方式為回到系統水池時,要回到哪個Y水池的比例 0:Y3 1:Y4 */
    u16 xBufToYBuf[2];
    /** 各押注區間X水池倍數深度的球數 */
    u16 xBufModeRate[5];
    /** 機率難度控制,控制分數存回水池的比例 0:最簡單 7:最難 */
    u16 randControlRate[8];
    /** 水池負分的上限倍數 */
    u16 xBufProtectMulti;
    /** X水池A模式MG滾輪模式的球數 */
    u16 xBufAMgModeRate[3];
    /** X水池A模式倍數列表 */
    u16 xBufAMultiList[10];
    /** X水池A模式倍數球數 */
    u16 xBufAMultiListRate[10];
    /** X水池A模式回分比例列表 */
    u16 xBufAReleaseRatio[7];
    /** X水池A模式回分比例球數 */
    u16 xBufAReleaseRatioRate[7];
    /** X水池B模式MG滾輪模式的球數 */
    u16 xBufBMgModeRate[3];
    /** X水池B模式倍數列表 */
    u16 xBufBMultiList[10];
    /** X水池B模式倍數球數 */
    u16 xBufBMultiListRate[10];
    /** X水池B模式回分比例列表 */
    u16 xBufBReleaseRatio[9];
    /** X水池B模式回分比例球數 */
    u16 xBufBReleaseRatioRate[9];
    /** X水池C模式MG滾輪模式的球數 */
    u16 xBufCMgModeRate[3];
    /** X水池C模式倍數列表 */
    u16 xBufCMultiList[10];
    /** X水池C模式倍數球數 */
    u16 xBufCMultiListRate[10];
    /** X水池C模式回分比例列表 */
    u16 xBufCReleaseRatio[11];
    /** X水池C模式回分比例球數 */
    u16 xBufCReleaseRatioRate[11];
    /** X水池D模式MG滾輪模式的球數 */
    u16 xBufDMgModeRate[3];
    /** X水池D模式倍數列表 */
    u16 xBufDMultiList[10];
    /** X水池D模式倍數球數 */
    u16 xBufDMultiListRate[10];
    /** X水池D模式回分比例列表 */
    u16 xBufDReleaseRatio[13];
    /** X水池D模式回分比例球數 */
    u16 xBufDReleaseRatioRate[13];
    /** X水池E模式MG滾輪模式的球數 */
    u16 xBufEMgModeRate[3];
    /** X水池E模式倍數列表 */
    u16 xBufEMultiList[10];
    /** X水池E模式倍數球數 */
    u16 xBufEMultiListRate[10];
    /** X水池E模式回分比例列表 */
    u16 xBufEReleaseRatio[15];
    /** X水池E模式回分比例球數 */
    u16 xBufEReleaseRatioRate[15];
    /** Y水池A模式倍數列表 */
    u16 yBufAMultiList[10];
    /** Y水池A模式倍數球數 */
    u16 yBufAMultiListRate[10];
    /** Y水池B模式倍數列表 */
    u16 yBufBMultiList[10];
    /** Y水池B模式倍數球數 */
    u16 yBufBMultiListRate[10];
    /** Y水池C模式倍數列表 */
    u16 yBufCMultiList[10];
    /** Y水池C模式倍數球數 */
    u16 yBufCMultiListRate[10];
    /** Y水池D模式倍數列表 */
    u16 yBufDMultiList[10];
    /** Y水池D模式倍數球數 */
    u16 yBufDMultiListRate[10];
    /** 將Y水池回分倍數分成單個或多個FG */
    u16 yBufToTwiceFg[2];
    /** Y水池回分時的FG基本倍數 */
    u16 yBufToTwiceFgBaseMulti;
} BUFFER_SETTING;

/** 水池設定中有小數的設定值 */
typedef struct
{
  /** 畫面上JP的累積比例數值 */
  double jpAddRatioScreen[3];
  /** 水池分數為正數時的累積比例 0:X 1:Y 2:Z*/
  double bufAddRatioPositive[3];
  /** 水池分數為負數時的累積比例 0:X 1:Y 2:Z*/
  double bufAddRatioNegative[3];
  /** 進入Y水池的比例 */
  double yBufAddRatio[4];
  /** 進入Z水池的比例 */
  double zBufAddRatio[3];
  /** 水池鎖定門檻 */
  double xBufLockRatio;
  /** 根據分機連線比例判定狀態 0:狀態一連線比例 1:狀態二連線比例*/
  double linkCountRatio[2];
} BUFFER_FLOATING_SETTING;

/** 
* 初始化水池設定值,修改遊戲最大押注時,須執行此函式
*/
extern void Rand_initBufSetting(void);
/**
* 檢查連線水池的獎項
* @param pClientInfo 機台資訊的陣列指標
* @param count 陣列的個數
*/
extern void Rand_checkLinkPrize(CLIENT_LINK_INFO_ST *pClientInfo, int count);
/**
* 主機增減水池的分數
* @param data 增減水池的分數
*/
extern void Rand_serverAddYZBuf(YZ_BUF_DATA data);
/**
* 當分機已開出大獎或放棄開獎時,使用此函式清除大獎資訊
* @param status 獎項狀態(FALSE:放棄,TRUE:拉走)
*/
extern void Rand_resetYPrize(u8 status);
/**
* 當分機已開出JP或放棄開JP時,主機使用此函式清除JP資訊
* @param idx 獎項索引
* @param status 獎項狀態(FALSE:放棄,TRUE:拉走)
* @param score 分數(實際中獎的分數)
*/
extern void Rand_resetJPPrize(u8 idx, u8 status, double score);
/**
* 當分機已拉中JP,主機使用此函式重置JP分數
* @param idx 獎項索引
*/
extern void Rand_resetJPScore(u8 idx);
/**
* 設定JP累積上限
* @param jpIdx JP索引
* @param score 上限分數,單位為cash
*/
extern void Rand_setJPMaxScore(int jpIdx, double score);
/**
* 設定JP起始分數
* @param idx JP索引
* @param score JP起始分數
*/
extern void Rand_setJPBaseScore(u8 idx, double score);
/**
* 主機增加JP的分數
* @param ptrJP 要增加的JP pointer
*/
extern void Rand_serverAddJPScore(double* pJPScore);

extern YZ_BUF_DATA serverLinkBuf;
/** 連線Jp的分數,主機使用 */
extern double serverJpScore[MAX_Z_BUFFER];
/** 連線獎項門檻 */
extern YZ_BUF_DATA linkBufThreshold;
/** 連項獎項Y資訊 */
extern YZ_PRIZE_INFO yPrizeRecord;
/** 連項獎項JP資訊 */
extern YZ_PRIZE_INFO jpPrizeRecord;
/** 上線分機數量 */
extern u8 aliveClientCount;
/** 上線分機資訊 */
extern CLIENT_LINK_INFO_ST clientInfo[MAX_CLIENT_NUM];
/** 連線獎項serial number */
extern u8 linkPrizeSerial;

#endif /* _RAND_BUF_H_ */

