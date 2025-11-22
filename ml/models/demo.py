"""
ML Profile Generator Demo
Session 10: Demonstration script

This script demonstrates the ML profile generation capabilities.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from profile_generator import FingerprintGenerator
import json


def demo_untrained_model():
    """
    Demo 1: Generate with untrained model

    Shows how the model generates profiles even without training.
    The profiles won't be realistic, but structure is correct.
    """
    print("=" * 80)
    print("Demo 1: Untrained Model Generation")
    print("=" * 80)

    print("\n🔧 Creating model...")
    model = FingerprintGenerator(use_pretrained=True)

    print("\n📝 Generating profile for:")
    params = {
        'country': 'US',
        'os': 'Windows',
        'browser': 'Chrome',
        'browserVersion': '120'
    }
    print(f"   {json.dumps(params, indent=2)}")

    print("\n🎲 Generating...")
    profile = model.generate(params)

    print("\n✅ Generated Profile:")
    print(f"   Canvas Hash: {profile['canvas']['hash']}")
    print(f"   WebGL Vendor: {profile['webgl']['unmaskedVendor']}")
    print(f"   WebGL Renderer: {profile['webgl']['renderer']}")
    print(f"   Hardware Cores: {profile['hardware']['hardwareConcurrency']}")
    print(f"   Hardware Memory: {profile['hardware']['deviceMemory']}GB")
    print(f"   Screen: {profile['screen']['width']}x{profile['screen']['height']}")
    print(f"   Audio Hash: {profile['audio']['hash']}")

    return profile


def demo_different_params():
    """
    Demo 2: Generate profiles with different parameters

    Shows how different parameters produce different profiles.
    """
    print("\n" + "=" * 80)
    print("Demo 2: Different Parameters")
    print("=" * 80)

    model = FingerprintGenerator(use_pretrained=True)

    test_cases = [
        {
            'country': 'US',
            'os': 'Windows',
            'browser': 'Chrome',
            'browserVersion': '120'
        },
        {
            'country': 'GB',
            'os': 'Mac',
            'browser': 'Safari',
            'browserVersion': '17'
        },
        {
            'country': 'DE',
            'os': 'Linux',
            'browser': 'Firefox',
            'browserVersion': '115'
        }
    ]

    for i, params in enumerate(test_cases, 1):
        print(f"\n{i}. Testing: {params['os']} - {params['browser']}")
        profile = model.generate(params)

        print(f"   Platform: {profile['hardware']['platform']}")
        print(f"   GPU: {profile['webgl']['unmaskedVendor']}")
        print(f"   Cores: {profile['hardware']['hardwareConcurrency']}")
        print(f"   Resolution: {profile['screen']['width']}x{profile['screen']['height']}")


def demo_consistency():
    """
    Demo 3: Consistency validation

    Shows that generated profiles maintain internal consistency.
    """
    print("\n" + "=" * 80)
    print("Demo 3: Consistency Validation")
    print("=" * 80)

    model = FingerprintGenerator(use_pretrained=True)

    # Test Mac profile
    print("\n🍎 Mac Profile:")
    mac_params = {
        'country': 'US',
        'os': 'Mac',
        'browser': 'Safari',
        'browserVersion': '17'
    }
    mac_profile = model.generate(mac_params)

    print(f"   Platform: {mac_profile['hardware']['platform']}")
    print(f"   GPU Vendor: {mac_profile['webgl']['unmaskedVendor']}")

    # Check Mac doesn't have NVIDIA
    has_nvidia = 'nvidia' in mac_profile['webgl']['unmaskedVendor'].lower()
    if not has_nvidia:
        print("   ✅ Consistent: Mac doesn't use NVIDIA GPU")
    else:
        print("   ⚠️  Warning: Mac with NVIDIA GPU (inconsistent)")

    # Test Windows profile
    print("\n🪟 Windows Profile:")
    win_params = {
        'country': 'US',
        'os': 'Windows',
        'browser': 'Chrome',
        'browserVersion': '120'
    }
    win_profile = model.generate(win_params)

    print(f"   Platform: {win_profile['hardware']['platform']}")
    print(f"   GPU Vendor: {win_profile['webgl']['unmaskedVendor']}")

    # Check Windows platform string
    if 'win' in win_profile['hardware']['platform'].lower():
        print("   ✅ Consistent: Platform matches OS")
    else:
        print("   ⚠️  Warning: Platform doesn't match OS")

    # Check screen ratio
    ratio = win_profile['screen']['width'] / win_profile['screen']['height']
    if 1.0 <= ratio <= 3.5:
        print(f"   ✅ Consistent: Screen ratio {ratio:.2f} is realistic")
    else:
        print(f"   ⚠️  Warning: Screen ratio {ratio:.2f} is unrealistic")


def demo_full_profile():
    """
    Demo 4: Full profile JSON output

    Shows complete profile structure.
    """
    print("\n" + "=" * 80)
    print("Demo 4: Full Profile Structure")
    print("=" * 80)

    model = FingerprintGenerator(use_pretrained=True)

    params = {
        'country': 'US',
        'os': 'Windows',
        'browser': 'Chrome',
        'browserVersion': '120'
    }

    print("\n📦 Generating full profile...")
    profile = model.generate(params)

    print("\n📄 Full Profile JSON:")
    print(json.dumps(profile, indent=2))


def main():
    """
    Run all demos
    """
    print("\n")
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 20 + "ML Profile Generator Demo" + " " * 33 + "║")
    print("║" + " " * 23 + "Session 10" + " " * 45 + "║")
    print("╚" + "=" * 78 + "╝")

    print("\n⚠️  Note: This demo uses an UNTRAINED model.")
    print("   For realistic profiles, train the model first:")
    print("   python train.py --data ../datasets/fingerprints.json --epochs 100")

    try:
        # Run demos
        demo_untrained_model()
        demo_different_params()
        demo_consistency()

        # Ask if user wants to see full profile
        print("\n" + "=" * 80)
        response = input("\n📄 Show full profile JSON? (y/N): ").strip().lower()
        if response == 'y':
            demo_full_profile()

        print("\n" + "=" * 80)
        print("✅ Demo completed successfully!")
        print("=" * 80)

        print("\n📚 Next steps:")
        print("   1. Train the model: python train.py --data ../datasets/fingerprints.json")
        print("   2. Generate profiles: python generate.py --params '{...}'")
        print("   3. Use TypeScript API: import { MLProfileGenerator } from './ml/api/generate'")

    except KeyboardInterrupt:
        print("\n\n⚠️  Demo interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
