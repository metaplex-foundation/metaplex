use {neon::prelude::*, solana_program::pubkey::Pubkey, std::str::FromStr};

fn to_vec(cx: &mut FunctionContext, list: &JsArray) -> NeonResult<Vec<String>> {
    let len = list.len(cx) as usize;
    let mut result: Vec<String> = Vec::with_capacity(len);
    for index in 0..len {
        let item = list.get(cx, index as u32)?;
        let item = item.to_string(cx)?;
        let item = item.value(cx);
        result.insert(index, item);
    }
    return Ok(result);
}

fn find_program_address(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let program_key = cx.argument::<JsString>(0)?.value(&mut cx);
    let block1 = cx.argument::<JsString>(1)?.value(&mut cx);
    let block2 = cx.argument::<JsString>(2)?.value(&mut cx);
    let blocks3 = cx.argument::<JsArray>(3)?;
    let blocks4 = cx.argument::<JsArray>(4)?;

    let program_id = Pubkey::from_str(&program_key[..]).unwrap();
    let cb_root = cx.argument::<JsFunction>(5)?.root(&mut cx);

    let channel = cx.channel();

    let blocks3 = to_vec(&mut cx, &blocks3)?;
    let blocks4 = to_vec(&mut cx, &blocks4)?;

    std::thread::spawn(move || {
        channel.send(move |mut cx| {
            let callback = cb_root.into_inner(&mut cx);
            let null = cx.null();
            let block1_n = cx.string(&block1);
            let block2_n = cx.string(&block2);
            for block3 in &blocks3 {
                for block4 in &blocks4 {

                    let s2 = Pubkey::from_str(&block2[..]).unwrap();
                    let s3 = Pubkey::from_str(&block3[..]).unwrap();
                    let s4 = Pubkey::from_str(&block4[..]).unwrap();
                    let seeds = [block1.as_bytes(), s2.as_ref(), s3.as_ref(), s4.as_ref()];

                    let address = Pubkey::try_find_program_address(&seeds, &program_id);
                    if let Some((key, _)) = address {
                        let key = key.to_string();
                        let key = cx.string(key);
                        let val3 = cx.string(block3);
                        let val4 = cx.string(block4);
                        callback.call(&mut cx, null, vec![key, block1_n, block2_n, val3, val4])?;
                    }
                }
            }
            callback.call(&mut cx, null, vec![null])?;
            Ok({})
        });
    });

    Ok(cx.undefined())
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("findProgramAddressList", find_program_address)?;
    Ok(())
}
