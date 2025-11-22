"""
Training Script for Fingerprint Generator
Session 10: Training Profile Generator ML Model

This script trains the FingerprintGenerator model on the collected dataset.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import json
import os
import sys
from typing import Dict, List, Any, Tuple
import numpy as np
from tqdm import tqdm
import argparse

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.profile_generator import (
    FingerprintGenerator,
    consistency_loss,
    realism_loss
)


class FingerprintDataset(Dataset):
    """
    PyTorch Dataset for fingerprint data
    """

    def __init__(self, data_path: str, max_samples: int = None):
        """
        Initialize dataset

        Args:
            data_path: Path to fingerprints.json file
            max_samples: Maximum number of samples to load (for testing)
        """
        print(f"Loading dataset from {data_path}...")

        with open(data_path, 'r') as f:
            self.data = json.load(f)

        if max_samples:
            self.data = self.data[:max_samples]

        print(f"Loaded {len(self.data)} fingerprints")

        # Build vocabulary for categorical features
        self.build_vocab()

    def build_vocab(self):
        """
        Build vocabulary for categorical features
        """
        self.os_vocab = {}
        self.browser_vocab = {}
        self.country_vocab = {}

        for fp in self.data:
            # Extract OS from metadata
            os_name = fp.get('metadata', {}).get('osName', 'Unknown')
            if os_name not in self.os_vocab:
                self.os_vocab[os_name] = len(self.os_vocab)

            # Extract browser from metadata
            browser_name = fp.get('metadata', {}).get('browserName', 'Unknown')
            if browser_name not in self.browser_vocab:
                self.browser_vocab[browser_name] = len(self.browser_vocab)

            # For country, we'll use a placeholder since it's not in the dataset
            self.country_vocab['US'] = 0

        print(f"Built vocabularies:")
        print(f"  OS: {len(self.os_vocab)} unique values")
        print(f"  Browser: {len(self.browser_vocab)} unique values")

    def __len__(self) -> int:
        return len(self.data)

    def __getitem__(self, idx: int) -> Tuple[Dict[str, Any], Dict[str, torch.Tensor]]:
        """
        Get a single sample

        Args:
            idx: Sample index

        Returns:
            Tuple of (params, targets) where:
                - params: Dictionary with generation parameters
                - targets: Dictionary with target component tensors
        """
        fp = self.data[idx]

        # Extract parameters
        metadata = fp.get('metadata', {})
        params = {
            'country': 'US',  # Placeholder
            'os': metadata.get('osName', 'Unknown'),
            'browser': metadata.get('browserName', 'Unknown'),
            'browserVersion': metadata.get('browserVersion', '120')
        }

        # Extract target components
        # For now, we'll create placeholder tensors since we need to process the raw data
        targets = {
            'canvas': torch.randn(512),  # Placeholder
            'webgl': torch.randn(512),   # Placeholder
            'audio': torch.randn(256),   # Placeholder
            'hardware': torch.randn(256), # Placeholder
            'screen': torch.randn(128)   # Placeholder
        }

        return params, targets


def train_epoch(
    model: FingerprintGenerator,
    dataloader: DataLoader,
    optimizer: optim.Optimizer,
    device: torch.device,
    epoch: int
) -> float:
    """
    Train for one epoch

    Args:
        model: FingerprintGenerator model
        dataloader: Training data loader
        optimizer: Optimizer
        device: Device to train on
        epoch: Current epoch number

    Returns:
        Average loss for the epoch
    """
    model.train()
    total_loss = 0.0
    num_batches = 0

    pbar = tqdm(dataloader, desc=f"Epoch {epoch}")

    for batch_idx, (params_batch, targets_batch) in enumerate(pbar):
        # Move targets to device
        for key in targets_batch:
            targets_batch[key] = targets_batch[key].to(device)

        # Generate fingerprints
        # Note: params_batch is a list of dicts, we process one at a time
        batch_loss = 0.0

        for i, params in enumerate(params_batch):
            # Generate components
            generated = model(params)

            # Extract targets for this sample
            targets = {
                key: targets_batch[key][i:i+1] for key in targets_batch
            }

            # Calculate losses
            cons_loss = consistency_loss(generated)
            real_loss = realism_loss(generated, targets)

            # Combined loss
            loss = cons_loss + real_loss
            batch_loss += loss

        # Average loss for batch
        batch_loss = batch_loss / len(params_batch)

        # Backward pass
        optimizer.zero_grad()
        batch_loss.backward()
        optimizer.step()

        # Update statistics
        total_loss += batch_loss.item()
        num_batches += 1

        # Update progress bar
        pbar.set_postfix({'loss': f'{batch_loss.item():.4f}'})

    return total_loss / num_batches


def validate(
    model: FingerprintGenerator,
    dataloader: DataLoader,
    device: torch.device
) -> float:
    """
    Validate the model

    Args:
        model: FingerprintGenerator model
        dataloader: Validation data loader
        device: Device to validate on

    Returns:
        Average validation loss
    """
    model.eval()
    total_loss = 0.0
    num_batches = 0

    with torch.no_grad():
        for params_batch, targets_batch in tqdm(dataloader, desc="Validating"):
            # Move targets to device
            for key in targets_batch:
                targets_batch[key] = targets_batch[key].to(device)

            # Generate fingerprints
            batch_loss = 0.0

            for i, params in enumerate(params_batch):
                # Generate components
                generated = model(params)

                # Extract targets for this sample
                targets = {
                    key: targets_batch[key][i:i+1] for key in targets_batch
                }

                # Calculate losses
                cons_loss = consistency_loss(generated)
                real_loss = realism_loss(generated, targets)

                # Combined loss
                loss = cons_loss + real_loss
                batch_loss += loss

            # Average loss for batch
            batch_loss = batch_loss / len(params_batch)

            total_loss += batch_loss.item()
            num_batches += 1

    return total_loss / num_batches


def main():
    """
    Main training function
    """
    parser = argparse.ArgumentParser(description='Train Fingerprint Generator')
    parser.add_argument('--data', type=str, default='../datasets/fingerprints.json',
                        help='Path to fingerprints dataset')
    parser.add_argument('--epochs', type=int, default=100,
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32,
                        help='Batch size')
    parser.add_argument('--lr', type=float, default=1e-4,
                        help='Learning rate')
    parser.add_argument('--max-samples', type=int, default=None,
                        help='Maximum number of samples to use (for testing)')
    parser.add_argument('--output', type=str, default='fingerprint_generator.pth',
                        help='Output model path')
    parser.add_argument('--device', type=str, default='cuda' if torch.cuda.is_available() else 'cpu',
                        help='Device to train on')
    parser.add_argument('--no-pretrained', action='store_true',
                        help='Do not use pretrained GPT-2')

    args = parser.parse_args()

    print("=" * 80)
    print("Fingerprint Generator Training")
    print("=" * 80)
    print(f"Configuration:")
    print(f"  Data: {args.data}")
    print(f"  Epochs: {args.epochs}")
    print(f"  Batch size: {args.batch_size}")
    print(f"  Learning rate: {args.lr}")
    print(f"  Device: {args.device}")
    print(f"  Use pretrained: {not args.no_pretrained}")
    print("=" * 80)

    # Set device
    device = torch.device(args.device)
    print(f"\n🔧 Using device: {device}")

    # Load dataset
    print("\n📊 Loading dataset...")
    dataset = FingerprintDataset(args.data, max_samples=args.max_samples)

    # Split into train and validation
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(
        dataset, [train_size, val_size]
    )

    print(f"  Train samples: {len(train_dataset)}")
    print(f"  Validation samples: {len(val_dataset)}")

    # Create data loaders
    # Note: batch_size=1 because we need to process each sample individually
    # due to the dictionary-based params
    train_loader = DataLoader(
        train_dataset,
        batch_size=1,
        shuffle=True,
        num_workers=0
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=1,
        shuffle=False,
        num_workers=0
    )

    # Create model
    print("\n🏗️  Creating model...")
    model = FingerprintGenerator(use_pretrained=not args.no_pretrained)
    model = model.to(device)

    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"  Total parameters: {total_params:,}")
    print(f"  Trainable parameters: {trainable_params:,}")

    # Create optimizer
    optimizer = optim.Adam(model.parameters(), lr=args.lr)

    # Training loop
    print("\n🚀 Starting training...")
    best_val_loss = float('inf')

    for epoch in range(1, args.epochs + 1):
        print(f"\nEpoch {epoch}/{args.epochs}")
        print("-" * 80)

        # Train
        train_loss = train_epoch(model, train_loader, optimizer, device, epoch)
        print(f"  Train loss: {train_loss:.4f}")

        # Validate
        val_loss = validate(model, val_loader, device)
        print(f"  Validation loss: {val_loss:.4f}")

        # Save best model
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            print(f"  💾 Saving best model (val_loss: {val_loss:.4f})")
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'train_loss': train_loss,
                'val_loss': val_loss,
            }, args.output)

    print("\n" + "=" * 80)
    print("✅ Training complete!")
    print(f"  Best validation loss: {best_val_loss:.4f}")
    print(f"  Model saved to: {args.output}")
    print("=" * 80)


if __name__ == '__main__':
    main()
