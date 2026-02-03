#![allow(non_snake_case)]

use ark_bn254::{Bn254, Fq, Fq2, G1Affine, G2Affine};
use ark_ff::PrimeField;
use ark_groth16::VerifyingKey;
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize, Compress};
// use worldcoin_ark_circom::read_zkey;  // Temporarily disabled due to Rust compiler panic
use serde::Deserialize;
use std::fs;
use std::io::{self, Write};
use std::str::FromStr;

#[derive(Debug, Deserialize)]
struct SnarkjsVKey {
    protocol: String,
    curve: String,
    #[serde(rename = "nPublic")]
    n_public: u64,
    vk_alpha_1: Vec<String>,
    vk_beta_2: Vec<Vec<String>>,
    vk_gamma_2: Vec<Vec<String>>,
    vk_delta_2: Vec<Vec<String>>,
    #[serde(rename = "IC")]
    ic: Vec<Vec<String>>,
}

fn parse_fq(s: &str) -> Result<Fq, Box<dyn std::error::Error>> {
    // Parse BigInt from string and convert to Fq using FromStr trait
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

fn convert_snarkjs_to_arkworks(snarkjs_vk: &SnarkjsVKey) -> Result<VerifyingKey<Bn254>, Box<dyn std::error::Error>> {
    let alpha_g1 = parse_g1(&snarkjs_vk.vk_alpha_1)?;
    let beta_g2 = parse_g2(&snarkjs_vk.vk_beta_2)?;
    let gamma_g2 = parse_g2(&snarkjs_vk.vk_gamma_2)?;
    let delta_g2 = parse_g2(&snarkjs_vk.vk_delta_2)?;
    
    let mut gamma_abc_g1 = Vec::new();
    for ic_point in &snarkjs_vk.ic {
        gamma_abc_g1.push(parse_g1(ic_point)?);
    }
    
    Ok(VerifyingKey {
        alpha_g1,
        beta_g2,
        gamma_g2,
        delta_g2,
        gamma_abc_g1,
    })
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() < 2 {
        eprintln!("Usage: {} <input.zkey|input_vkey.json> [output.bin]", args[0]);
        eprintln!("  Converts .zkey file (using ark-circom) or snarkjs verification key JSON to Arkworks canonical format");
        eprintln!("  If output.bin is not specified, outputs hex to stdout");
        std::process::exit(1);
    }
    
    let input_path = &args[1];
    let output_path = args.get(2);
    
    // TODO: Use ark-circom to read .zkey files directly (recommended by Sui)
    // Currently disabled due to Rust compiler panic with worldcoin-ark-circom
    // For now, we only support JSON files
    if input_path.ends_with(".zkey") {
        eprintln!("Error: .zkey file support temporarily disabled due to Rust compiler issues.");
        eprintln!("Please use the corresponding _vkey.json file instead.");
        eprintln!("Example: Use aggregate_count_vkey.json instead of aggregate_count.zkey");
        std::process::exit(1);
    }
    
    println!("Reading snarkjs JSON file...");
    // Manual parsing for JSON files
    let json_str = fs::read_to_string(input_path)?;
    let snarkjs_vk: SnarkjsVKey = serde_json::from_str(&json_str)?;
    let vk = convert_snarkjs_to_arkworks(&snarkjs_vk)?;
    
    // Debug: Print verification key info
    println!("\n=== Verification Key Info ===");
    println!("IC points (gamma_abc) count: {}", vk.gamma_abc_g1.len());
    
    // Try both compressed and uncompressed formats
    let mut bytes_compressed = Vec::new();
    vk.serialize_with_mode(&mut bytes_compressed, Compress::Yes)?;
    
    let mut bytes_uncompressed = Vec::new();
    vk.serialize_with_mode(&mut bytes_uncompressed, Compress::No)?;
    
    println!("\n=== Serialized Format Analysis ===");
    println!("Generated verification key bytes:");
    println!("   Compressed: {} bytes", bytes_compressed.len());
    println!("   Uncompressed: {} bytes", bytes_uncompressed.len());
    
    // Debug: Print serialized structure
    println!("\n=== Compressed Format Structure (first 128 bytes) ===");
    if bytes_compressed.len() >= 64 {
        println!("First 64 bytes (alpha_g1?): {}", hex::encode(&bytes_compressed[..64]));
    }
    if bytes_compressed.len() >= 128 {
        println!("Next 64 bytes: {}", hex::encode(&bytes_compressed[64..128]));
    }
    
    println!("\n=== Uncompressed Format Structure (first 192 bytes) ===");
    if bytes_uncompressed.len() >= 64 {
        println!("First 64 bytes (alpha_g1): {}", hex::encode(&bytes_uncompressed[..64]));
    }
    if bytes_uncompressed.len() >= 192 {
        println!("Next 128 bytes (beta_g2?): {}", hex::encode(&bytes_uncompressed[64..192]));
    }
    
    // Try compressed format - Sui test example is 296 bytes (compressed)
    // Even though fastcrypto source mentions deserialize_uncompressed, the working
    // Sui test example uses compressed format, so let's match that
    let bytes = &bytes_compressed;
    let format_name = "compressed (matches Sui test example - 296 bytes)";
    
    // Verify the structure looks correct
    println!("\nVerification key structure:");
    println!("   alpha_g1 (G1): {} bytes", 64);
    println!("   beta_g2 (G2): {} bytes", 128);
    println!("   gamma_g2 (G2): {} bytes", 128);
    println!("   delta_g2 (G2): {} bytes", 128);
    println!("   IC points (G1): {} points × 64 bytes = {} bytes", 
             vk.gamma_abc_g1.len(), vk.gamma_abc_g1.len() * 64);
    let expected_size = 64 + 128 + 128 + 128 + (vk.gamma_abc_g1.len() * 64);
    println!("   Expected total: {} bytes", expected_size);
    println!("   Actual total: {} bytes", bytes.len());
    
    if bytes.len() != expected_size {
        eprintln!("⚠️  Warning: Size mismatch! This might indicate a serialization issue.");
    } else {
        println!("✅ Size matches expected structure!");
    }
    
    // Try to deserialize back to verify round-trip
    println!("\nTesting round-trip deserialization...");
    let round_trip_ok = if bytes.len() == bytes_compressed.len() {
        // Testing compressed format
        match VerifyingKey::<Bn254>::deserialize_compressed(bytes.as_slice()) {
            Ok(_) => {
                println!("✅ Round-trip deserialization successful (compressed)!");
                true
            },
            Err(e) => {
                eprintln!("❌ Round-trip deserialization failed (compressed)!");
                eprintln!("   Error: {:?}", e);
                false
            }
        }
    } else {
        // Testing uncompressed format
        match VerifyingKey::<Bn254>::deserialize_uncompressed(bytes.as_slice()) {
            Ok(_) => {
                println!("✅ Round-trip deserialization successful (uncompressed)!");
                true
            },
            Err(e) => {
                eprintln!("❌ Round-trip deserialization failed (uncompressed)!");
                eprintln!("   Error: {:?}", e);
                false
            }
        }
    };
    
    if round_trip_ok {
        println!("   This confirms the bytes are valid Arkworks canonical format.");
    }
    
    // Compare with Sui test example structure
    println!("\n=== Comparison with Sui Test Example ===");
    let sui_test_vk_hex = "53d75f472c207c7fcf6a34bc1e50cf0d7d2f983dd2230ffcaf280362d162c3871cae3e4f91b77eadaac316fe625e3764fb39af2bb5aa25007e9bc6b116f6f02f597ad7c28c4a33da5356e656dcef4660d7375973fe0d7b6dc642d51f16b6c8806030ca5b462a3502d560df7ff62b7f1215195233f688320de19e4b3a2a2cb6120ae49bcc0abbd3cbbf06b29b489edbf86e3b679f4e247464992145f468e3c08db41e5e09002a7170cb4cc56ae96b152d17b6b0d1b9333b41f2325c3c8a9d2e2df98f8e2315884fae52b3c6bb329df0359daac4eff4d2e7ce729078b10d79d42f02000000000000001dcc52e058148a622c51acfdee6e181252ec0e9717653f0be1faaf2a68222e0dd2ccf4e1e8b088efccfdb955a1ff4a0fd28ae2ccbe1a112449ddae8738fb40b0";
    let sui_test_bytes = hex::decode(sui_test_vk_hex).unwrap_or_default();
    
    if sui_test_bytes.len() == bytes.len() {
        println!("✅ Size matches Sui test example: {} bytes", bytes.len());
        println!("First 32 bytes comparison:");
        println!("  Sui:  {}", hex::encode(&sui_test_bytes[..32.min(sui_test_bytes.len())]));
        println!("  Ours: {}", hex::encode(&bytes[..32.min(bytes.len())]));
        
        // Find first difference
        let mut first_diff = None;
        for i in 0..bytes.len().min(sui_test_bytes.len()) {
            if bytes[i] != sui_test_bytes[i] {
                first_diff = Some(i);
                break;
            }
        }
        if let Some(diff_pos) = first_diff {
            println!("⚠️  First difference at byte {}:", diff_pos);
            println!("  Sui:  {:02x}", sui_test_bytes[diff_pos]);
            println!("  Ours: {:02x}", bytes[diff_pos]);
        } else if bytes.len() == sui_test_bytes.len() {
            println!("✅ Bytes match Sui test example exactly!");
        }
    } else {
        println!("⚠️  Size mismatch with Sui test:");
        println!("  Sui:  {} bytes", sui_test_bytes.len());
        println!("  Ours: {} bytes", bytes.len());
    }
    
    if let Some(output) = output_path {
        fs::write(output, bytes)?;
        println!("\n✅ Converted verification key written to: {}", output);
        println!("   Compressed size: {} bytes", bytes_compressed.len());
        println!("   Uncompressed size: {} bytes", bytes_uncompressed.len());
        println!("   Using: {} format", format_name);
    } else {
        // Output as hex to stdout
        let hex_str = hex::encode(bytes);
        io::stdout().write_all(hex_str.as_bytes())?;
    }
    
    Ok(())
}
