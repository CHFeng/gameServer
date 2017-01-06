#include <node.h>
#include <stdlib.h>     /* srand, rand */
#include <time.h>       /* time */

typedef unsigned char u8;
typedef unsigned short u16;
typedef unsigned int u32;

using namespace v8;

/** 亂數數值的最大長度 */
#define RANDOM_NUM_SIZE 512

static u32 testVal = 0;

/**
 * 產生介於0~(RANDOM_NUM_SIZE-1)的整數
 */
void Rand_getElement(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  int value = rand() % RANDOM_NUM_SIZE;
  Local<Number> num = Number::New(isolate, value);

  args.GetReturnValue().Set(num);
}

/**
 * 查表決定要顯示的物件
 * @param num 亂數數值
 * @param p_range 機率參數
 * @param size 機率參數的矩陣大小
 * @return 查表後的結果
 */
void Rand_checkTable(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    int i, tmpVal;
    int arg1 = args[0]->Uint32Value();
    int arg3 = args[2]->Uint32Value();
    Local<Array> arr = Local<Array>::Cast(args[1]);

    testVal++;
    printf("arg1:%d, testVal:%d\n", arg1, testVal);
    
    tmpVal = 0;
    for (i = 0 ; i < arg3 ; i++) {
        tmpVal += arr->Get(i)->Uint32Value();

        if (arg1 < tmpVal) {
            break;
        }
    }

    if (i >= arg3) {
        i = arg3 - 1;
    }

    Local<Number> num = Number::New(isolate, i);
    args.GetReturnValue().Set(num);
}

void init(Local<Object> exports) {
    srand (time(NULL));
    NODE_SET_METHOD(exports, "Rand_getElement", Rand_getElement);
    NODE_SET_METHOD(exports, "Rand_checkTable", Rand_checkTable);
}

NODE_MODULE(randTool, init)