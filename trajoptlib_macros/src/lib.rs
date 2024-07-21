extern crate proc_macro;
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, Expr};

#[proc_macro]
pub fn create_builder(input: TokenStream) -> TokenStream {
    let condition = parse_macro_input!(input as Expr);

    let expanded = quote! {
        let mut path_builder = if #condition {
            PathBuilder::Swerve(SwervePathBuilder::new())
        } else {
            PathBuilder::Differential(DifferentialPathBuilder::new())
        };
    };

    TokenStream::from(expanded)
}
