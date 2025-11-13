"""
Fingerprint Generation Script
Session 10: Training Profile Generator ML Model

This script generates fingerprint profiles using the trained model.
"""

import torch
import json
import sys
import os
import argparse
from typing import Dict, Any

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.profile_generator import FingerprintGenerator


def load_model(model_path: str, device: torch.device) -> FingerprintGenerator:
    """
    Load trained model from checkpoint

    Args:
        model_path: Path to model checkpoint
        device: Device to load model on

    Returns:
        Loaded FingerprintGenerator model
    """
    print(f"Loading model from {model_path}...")

    # Create model
    model = FingerprintGenerator(use_pretrained=True)

    # Load checkpoint if exists
    if os.path.exists(model_path):
        checkpoint = torch.load(model_path, map_location=device)
        model.load_state_dict(checkpoint['model_state_dict'])
        print(f"  Loaded checkpoint from epoch {checkpoint.get('epoch', 'unknown')}")
        print(f"  Validation loss: {checkpoint.get('val_loss', 'unknown')}")
    else:
        print(f"  Warning: Model checkpoint not found at {model_path}")
        print(f"  Using untrained model")

    model = model.to(device)
    model.eval()

    return model


def generate_fingerprint(
    model: FingerprintGenerator,
    params: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate a fingerprint profile

    Args:
        model: FingerprintGenerator model
        params: Generation parameters

    Returns:
        Generated fingerprint profile
    """
    with torch.no_grad():
        fingerprint = model.generate(params)

    return fingerprint


def main():
    """
    Main generation function
    """
    parser = argparse.ArgumentParser(description='Generate Fingerprint Profile')
    parser.add_argument('--model', type=str, default='fingerprint_generator.pth',
                        help='Path to trained model')
    parser.add_argument('--params', type=str, required=True,
                        help='JSON string with generation parameters')
    parser.add_argument('--output', type=str, default=None,
                        help='Output file path (if not specified, prints to stdout)')
    parser.add_argument('--device', type=str, default='cpu',
                        help='Device to use for generation')
    parser.add_argument('--pretty', action='store_true',
                        help='Pretty print JSON output')

    args = parser.parse_args()

    # Set device
    device = torch.device(args.device)

    # Parse parameters
    try:
        params = json.loads(args.params)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in params: {e}", file=sys.stderr)
        sys.exit(1)

    # Validate required parameters
    required_params = ['country', 'os', 'browser']
    for param in required_params:
        if param not in params:
            print(f"Error: Missing required parameter: {param}", file=sys.stderr)
            sys.exit(1)

    # Set default browser version if not provided
    if 'browserVersion' not in params:
        params['browserVersion'] = '120'

    # Load model
    model = load_model(args.model, device)

    # Generate fingerprint
    print(f"Generating fingerprint with parameters: {params}", file=sys.stderr)
    fingerprint = generate_fingerprint(model, params)

    # Format output
    if args.pretty:
        output = json.dumps(fingerprint, indent=2)
    else:
        output = json.dumps(fingerprint)

    # Write output
    if args.output:
        with open(args.output, 'w') as f:
            f.write(output)
        print(f"Fingerprint saved to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == '__main__':
    # If run without arguments, use stdin for params
    if len(sys.argv) == 1:
        print("Reading parameters from stdin...", file=sys.stderr)
        try:
            params_str = sys.stdin.read()
            params = json.loads(params_str)

            # Set default values
            if 'browserVersion' not in params:
                params['browserVersion'] = '120'

            # Load model
            device = torch.device('cpu')
            model_path = os.path.join(os.path.dirname(__file__), 'fingerprint_generator.pth')
            model = load_model(model_path, device)

            # Generate fingerprint
            fingerprint = generate_fingerprint(model, params)

            # Output JSON
            print(json.dumps(fingerprint))

        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        main()
