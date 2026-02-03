#![allow(non_snake_case)]

use ark_bn254::{Bn254, Fq, Fq2, G1Affine, G2Affine};
use ark_ff::fields::PrimeField;
use ark_groth16::Proof;
use ark_serialize::{CanonicalSerialize, Compress};
use serde::Deserialize;
use std::fs;
use std::io::{self, Write};
use std::str::FromStr;

#[derive(Debug, Deserialize)]
struct SnarkjsProof {
    #[serde(default)]
    protocol: Option<String>,
    #[serde(default)]
    curve: Option<String>,
    pi_a: Vec<String>,
    pi_b: Vec<Vec<String>>,
    pi_c: Vec<String>,
}

fn parse_fq(s: &str) -> Result<Fq, Box<dyn std::error::Error>> {
    let big_int = s.parse::<num_bigint::BigInt>()?;
    let fq_str = big_int.to_string();
    Fq::from_str(&fq_str).map_err(|_| format!("Failed to parse Fq from '{}'", s).into())
}

fn parse_g1(point: &[String]) -> Result<G1Affine, Box<dyn std::error::Error>> {
    if point.len() < 2 {
        return Err("G1 point must have at least 2 coordinates".into());
    }
    let x = parse_fq(&point[0])?;
    let y = parse_fq(&point[1])?;
    Ok(G1Affine::new_unchecked(x, y))
}

fn parse_g2(point: &[Vec<String>]) -> Result<G2Affine, Box<dyn std::error::Error>> {
    if point.len() < 2 {
        return Err("G2 point must have at least 2 coordinate pairs".into());
    }
    let c0 = parse_fq(&point[0][0])?;
    let c1 = parse_fq(&point[0][1])?;
    let c2 = parse_fq(&point[1][0])?;
    let c3 = parse_fq(&point[1][1])?;
    let x = Fq2::new(c0, c1);
    let y = Fq2::new(c2, c3);
    Ok(G2Affine::new_unchecked(x, y))
}

fn convert_snarkjs_to_arkworks(snarkjs_proof: &SnarkjsProof) -> Result<Proof<Bn254>, Box<dyn std::error::Error>> {
    let a = parse_g1(&snarkjs_proof.pi_a)?;
    let b = parse_g2(&snarkjs_proof.pi_b)?;
    let c = parse_g1(&snarkjs_proof.pi_c)?;
    
    Ok(Proof { a, b, c })
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() < 2 {
        eprintln!("Usage: {} <input_proof.json> [output.bin]", args[0]);
        eprintln!("  Converts snarkjs proof JSON to Arkworks canonical compressed format");
        eprintln!("  If output.bin is not specified, outputs hex to stdout");
        std::process::exit(1);
    }
    
    let input_path = &args[1];
    let output_path = args.get(2);
    
    let json_str = fs::read_to_string(input_path)?;
    let snarkjs_proof: SnarkjsProof = serde_json::from_str(&json_str)?;
    
    let proof = convert_snarkjs_to_arkworks(&snarkjs_proof)?;
    
    // Serialize using compressed format (Sui example uses serialize_compressed = 128 bytes)
    // The Sui example proof is 128 bytes, matching compressed format
    let mut bytes = Vec::new();
    proof.serialize_with_mode(&mut bytes, Compress::Yes)?;
    
    if let Some(output) = output_path {
        fs::write(output, &bytes)?;
        println!("✅ Converted proof written to: {}", output);
        println!("   Size: {} bytes", bytes.len());
    } else {
        let hex_str = hex::encode(&bytes);
        io::stdout().write_all(hex_str.as_bytes())?;
    }
    
    Ok(())
}
