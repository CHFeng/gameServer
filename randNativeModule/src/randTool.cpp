﻿/** 
 * @file
 * 機率模組所使用到的相關函式
 * @author DanielFeng
 */
#include "randTool.h"

#define API_Printf printf
/** 亂數數值的最大長度 */
#define RANDOM_NUM_SIZE 512
/** 亂數滾動的次數 */
#define RANDOM_NUM_MOVE_TIMES 10000

/* private variable & functions */
/** 所有遊戲要進行洗牌的元素 */
static u16 randNumArray[RANDOM_NUM_SIZE];

static void Rand_resetRandNum(void);
static u16 Rand_getRandOnce(void);
static u32 Rand_getRandTwice(void);

#define FIST_MAGIC ((((65536.0 * 65536.0 * 16)+(65536.0 * 0.5))* 65536.0))

/**
* 將double數值轉成u32,會進行四捨五入的動作,可避免數值少1
* @param val 要轉換的double數值
* @return u32的回傳值
*/
u32 Rand_toU32(double val)
{
    double dtemp = FIST_MAGIC + val;
    return ((*(u32 *)&dtemp) - 0x80000000);
}

/**
* 交換函式(將a和b對換)
* @param a 要交換的指標a
* @param b 要交換的指標b
*/
void Rand_swap(u16* a, u16* b)
{
    u16 temp;

    temp = *a;
    *a = *b;
    *b = temp;
}

/**
* 攪動亂數陣列共times次
* @param times 攪動次數
*/
void Rand_moveRandNum(u32 times)
{
    u32 i;
    u16 idx1, idx2;

    for (i = 0; i < times; i++) {
        idx1 = (u16)(rand() % RANDOM_NUM_SIZE);
        idx2 = (u16)(rand() % RANDOM_NUM_SIZE);
        ///交換任意2個元素
        Rand_swap(&randNumArray[idx1], &randNumArray[idx2]);
    }
}

/**
* 初始化亂數陣列,並攪動亂數陣列共RANDOM_NUM_MOVE_TIMES次
*/
void Rand_initRandNum(void)
{
    Rand_resetRandNum();
    Rand_moveRandNum(RANDOM_NUM_MOVE_TIMES);
}

/**
* 依據range的範圍輸出亂數值
* @param range 輸出亂數值之範圍
* @return 亂數值(0~(range-1))
*/
u16 Rand_getRandNum(u16 range)
{
    u32 value, over_value;
    u32 whileCount = 0;

    over_value = ((RANDOM_NUM_SIZE*RANDOM_NUM_SIZE)/range)*range;

    do {
        value = Rand_getRandTwice();
        whileCount++;
    } while (value >= over_value);

    value %= range;

    return (u16)value;
}

/**
* 產生介於0~(RANDOM_NUM_SIZE-1)的整數
* @return 亂數值(0~(RANDOM_NUM_SIZE-1))
*/
u16 Rand_getElement(void)
{
    return Rand_getRandNum(RANDOM_NUM_SIZE);
}

/**
* 產生傳入倍數的4/10 ~ 9/10比例的亂數倍數
* @param totalMulti 總倍數
* @return 亂數值4/10 ~ 9/10
*/
u16 Rand_getRandMulti(u32 totalMulti)
{
    u16 randMulti = totalMulti / 10;
    u8 randIdx = 4 + rand() % 6;
    
    randMulti *=  randIdx;

    return randMulti;
}

/**
* 查表決定要顯示的物件
* @param num 亂數數值
* @param p_range 機率參數
* @param size 機率參數的矩陣大小
* @return 查表後的結果
*/
u8 Rand_checkTable(u16 num, u16* p_range, u8 size)
{
    u8 i;
    u16 temp_value;

    temp_value = 0;

    for (i = 0 ; i < size ; i++) {
        temp_value += p_range[i];

        if (num < temp_value) {
            break;
        }
    }

    if (i >= size) {
        i = size - 1;
    }

    return i;
}

/**
* @private
* 把亂數陣列重新梳理一次,由0排到RANDOM_NUM_SIZE-1
*/
static void Rand_resetRandNum(void)
{
    u16 i;

    for (i = 0; i < RANDOM_NUM_SIZE; i++) {
        randNumArray[i] = i;
    }
}

/**
* 根據亂數產生的數字(介於0~(RANDOM_NUM_SIZE-1)的整數)，來取得亂數陣列之值
* @return 亂數陣列之值(介於0~(RANDOM_NUM_SIZE-1)的整數)
*/
static u16 Rand_getRandOnce(void)
{
    u16 idx;

    idx = (u16)(rand()%RANDOM_NUM_SIZE);

    return randNumArray[idx];
}

/**
* 取得兩次亂數陣列之值後產生一組亂數值
* (介於0~(((AP_RAND_RANGE-1)*AP_RAND_RANGE)+(AP_RAND_RANGE-1))的整數)
* @return 亂數值(0~(((AP_RAND_RANGE-1)*AP_RAND_RANGE)+(AP_RAND_RANGE-1)))
*/
static u32 Rand_getRandTwice(void)
{
    u16 idxa, idxb;
    u32 idxc;

    idxa = Rand_getRandOnce();
    idxb = Rand_getRandOnce();
    idxc = (idxa*RANDOM_NUM_SIZE)+idxb;

    return idxc;
}