﻿/**
 * @file
 * 機率模組所使用到的相關函式header file
 * @author DanielFeng
 */

#ifndef _RAND_TOOL_H_
#define _RAND_TOOL_H_

#include "stdlib.h"
#include "string.h"

#include "myTypes.h"

extern void Rand_swap(u16* a, u16* b);
extern void Rand_moveRandNum(u32 times);
extern void Rand_initRandNum(void);
extern u16 Rand_getRandNum(u16 range);
extern u16 Rand_getElement(void);
extern u16 Rand_getRandMulti(u32 totalMulti);
extern u8 Rand_checkTable(u16 num, u16* p_range, u8 size);
extern u8 Rand_checkReserveData(void);
extern void Rand_saveReserveData(void);
extern u32 Rand_toU32(double val);
extern u32 Rand_getCRC32(u8 *buf, u32 size);

#endif /* _RAND_TOOL_H_ */

