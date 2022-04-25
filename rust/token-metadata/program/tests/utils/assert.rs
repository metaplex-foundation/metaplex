#[macro_export]
macro_rules! assert_transport_error {
    ($error:expr, $matcher:pat) => {
        match $error {
            $matcher => {
                assert!(true)
            }
            _ => assert!(false),
        }
    };
}

#[macro_export]
macro_rules! assert_custom_error {
    ($error:expr, $matcher:pat) => {
        match $error {
            TransportError::TransactionError(TransactionError::InstructionError(
                0,
                InstructionError::Custom(x),
            )) => match FromPrimitive::from_i32(x as i32) {
                Some($matcher) => assert!(true),
                Some(other) => {
                    assert!(
                        false,
                        "Expected another custom instruction error than '{:#?}'",
                        other
                    )
                }
                None => assert!(false, "Expected custom instruction error"),
            },
            err => assert!(
                false,
                "Expected custom instruction error but got '{:#?}'",
                err
            ),
        };
    };
}
