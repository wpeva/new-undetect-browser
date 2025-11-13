"""
ML Fingerprint Profile Generator
Session 10: Training Profile Generator ML Model

This module implements a machine learning model for generating
realistic and consistent browser fingerprint profiles.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import GPT2Model, GPT2Tokenizer, GPT2Config
import json
import numpy as np
from typing import Dict, List, Any, Optional
import hashlib


class FingerprintEncoder(nn.Module):
    """
    Encodes input parameters (country, OS, browser, etc.) into embeddings
    """

    def __init__(self, embedding_dim: int = 256):
        super().__init__()
        self.embedding_dim = embedding_dim

        # Define embedding layers for categorical features
        self.country_embedding = nn.Embedding(250, 32)  # 250 countries
        self.os_embedding = nn.Embedding(10, 16)        # Windows, Mac, Linux, etc.
        self.browser_embedding = nn.Embedding(10, 16)   # Chrome, Firefox, Safari, etc.
        self.device_type_embedding = nn.Embedding(5, 8) # Desktop, Mobile, Tablet

        # Projection layer to combine embeddings
        self.projection = nn.Linear(72, embedding_dim)

    def forward(self, params: Dict[str, int]) -> torch.Tensor:
        """
        Encode parameters into embeddings

        Args:
            params: Dictionary with encoded categorical features

        Returns:
            Tensor of shape (batch_size, embedding_dim)
        """
        country = self.country_embedding(params['country'])
        os = self.os_embedding(params['os'])
        browser = self.browser_embedding(params['browser'])
        device_type = self.device_type_embedding(params['device_type'])

        # Concatenate all embeddings
        combined = torch.cat([country, os, browser, device_type], dim=-1)

        # Project to embedding dimension
        return self.projection(combined)


class FingerprintDecoder(nn.Module):
    """
    Decodes latent representation into fingerprint components
    """

    def __init__(self, input_dim: int = 768, hidden_dim: int = 1024):
        super().__init__()

        # Separate decoders for each component
        self.canvas_decoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, 512),
            nn.Tanh()
        )

        self.webgl_decoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, 512),
            nn.Tanh()
        )

        self.audio_decoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, 256),
            nn.Tanh()
        )

        self.hardware_decoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, 256),
            nn.Tanh()
        )

        self.screen_decoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, 128),
            nn.Tanh()
        )

    def forward(self, latent: torch.Tensor) -> Dict[str, torch.Tensor]:
        """
        Decode latent representation into fingerprint components

        Args:
            latent: Tensor of shape (batch_size, input_dim)

        Returns:
            Dictionary with decoded components
        """
        return {
            'canvas': self.canvas_decoder(latent),
            'webgl': self.webgl_decoder(latent),
            'audio': self.audio_decoder(latent),
            'hardware': self.hardware_decoder(latent),
            'screen': self.screen_decoder(latent)
        }


class FingerprintGenerator(nn.Module):
    """
    Main generator model using GPT-2 as the backbone
    """

    def __init__(self, use_pretrained: bool = True):
        super().__init__()

        # Initialize encoder
        self.encoder = FingerprintEncoder(embedding_dim=256)

        # Initialize GPT-2 model
        if use_pretrained:
            self.gpt2 = GPT2Model.from_pretrained('gpt2')
            self.tokenizer = GPT2Tokenizer.from_pretrained('gpt2')
            # Add pad token if not present
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
        else:
            config = GPT2Config(
                vocab_size=50257,
                n_positions=1024,
                n_ctx=1024,
                n_embd=768,
                n_layer=12,
                n_head=12
            )
            self.gpt2 = GPT2Model(config)
            self.tokenizer = GPT2Tokenizer.from_pretrained('gpt2')
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token

        # Projection from embedding to GPT-2 input
        self.input_projection = nn.Linear(256, 768)

        # Decoder for generating fingerprint components
        self.decoder = FingerprintDecoder(input_dim=768, hidden_dim=1024)

        # Additional projection for final output
        self.output_projection = nn.Linear(768, 2048)

    def encode_params(self, params: Dict[str, Any]) -> torch.Tensor:
        """
        Convert parameters to token embeddings

        Args:
            params: Dictionary with parameters

        Returns:
            Token embeddings tensor
        """
        # Create text representation of parameters
        text = f"country:{params.get('country', 'US')} os:{params.get('os', 'Windows')} browser:{params.get('browser', 'Chrome')} version:{params.get('browserVersion', '120')}"

        # Tokenize
        tokens = self.tokenizer.encode(text, return_tensors='pt')

        return tokens

    def forward(self, params: Dict[str, Any]) -> Dict[str, torch.Tensor]:
        """
        Generate fingerprint from parameters

        Args:
            params: Dictionary with generation parameters

        Returns:
            Dictionary with generated fingerprint components
        """
        # Encode parameters to tokens
        tokens = self.encode_params(params)

        # Get device
        device = next(self.parameters()).device
        tokens = tokens.to(device)

        # Pass through GPT-2
        with torch.no_grad():
            gpt2_output = self.gpt2(tokens)

        # Get last hidden state
        hidden = gpt2_output.last_hidden_state[:, -1, :]  # (batch_size, 768)

        # Decode into fingerprint components
        components = self.decoder(hidden)

        return components

    def decode_canvas(self, tensor: torch.Tensor) -> Dict[str, Any]:
        """
        Decode canvas component from tensor

        Args:
            tensor: Canvas tensor of shape (batch_size, 512)

        Returns:
            Dictionary with canvas fingerprint data
        """
        # Convert tensor to numpy
        data = tensor.cpu().detach().numpy()[0]

        # Generate hash from tensor
        hash_input = ''.join([f"{x:.4f}" for x in data[:10]])
        canvas_hash = hashlib.md5(hash_input.encode()).hexdigest()[:8]

        return {
            'hash': canvas_hash,
            'parameters': {
                'width': 280,
                'height': 60,
                'textRendering': 'geometricPrecision',
                'fontFamily': 'Arial'
            }
        }

    def decode_webgl(self, tensor: torch.Tensor, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decode WebGL component from tensor

        Args:
            tensor: WebGL tensor of shape (batch_size, 512)
            params: Original parameters for consistency

        Returns:
            Dictionary with WebGL fingerprint data
        """
        os_name = params.get('os', 'Windows')

        # Select GPU based on OS and tensor values
        data = tensor.cpu().detach().numpy()[0]
        gpu_index = int(abs(data[0]) * 10) % 5

        # Define GPU options based on OS
        if os_name.lower() == 'windows':
            vendors = ['NVIDIA Corporation', 'AMD', 'Intel']
            renderers = [
                'ANGLE (NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0)',
                'ANGLE (AMD Radeon RX 6800 Direct3D11 vs_5_0 ps_5_0)',
                'ANGLE (Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)'
            ]
        elif 'mac' in os_name.lower():
            vendors = ['Apple Inc.', 'Apple Inc.', 'Apple Inc.']
            renderers = [
                'Apple M1',
                'Apple M2',
                'AMD Radeon Pro 5500M'
            ]
        else:  # Linux
            vendors = ['NVIDIA Corporation', 'AMD', 'Intel Open Source Technology Center']
            renderers = [
                'NVIDIA GeForce GTX 1080/PCIe/SSE2',
                'AMD Radeon RX 6800',
                'Mesa Intel(R) UHD Graphics 630 (CML GT2)'
            ]

        vendor_index = min(gpu_index, len(vendors) - 1)

        return {
            'vendor': 'WebKit',
            'renderer': renderers[vendor_index],
            'version': 'WebGL 1.0',
            'shadingLanguageVersion': 'WebGL GLSL ES 1.0',
            'unmaskedVendor': vendors[vendor_index],
            'unmaskedRenderer': renderers[vendor_index],
            'extensions': [
                'ANGLE_instanced_arrays',
                'EXT_blend_minmax',
                'EXT_color_buffer_half_float',
                'EXT_texture_filter_anisotropic',
                'WEBGL_compressed_texture_s3tc',
                'WEBGL_debug_renderer_info',
                'WEBGL_depth_texture',
                'WEBGL_draw_buffers'
            ],
            'supportedExtensions': [
                'ANGLE_instanced_arrays',
                'EXT_blend_minmax',
                'EXT_color_buffer_half_float',
                'EXT_texture_filter_anisotropic'
            ],
            'maxTextureSize': 16384,
            'maxViewportDims': [16384, 16384],
            'maxRenderbufferSize': 16384,
            'aliasedLineWidthRange': [1, 1],
            'aliasedPointSizeRange': [1, 1024]
        }

    def decode_audio(self, tensor: torch.Tensor) -> Dict[str, Any]:
        """
        Decode audio component from tensor

        Args:
            tensor: Audio tensor of shape (batch_size, 256)

        Returns:
            Dictionary with audio fingerprint data
        """
        data = tensor.cpu().detach().numpy()[0]

        # Generate hash from tensor
        hash_input = ''.join([f"{x:.4f}" for x in data[:10]])
        audio_hash = hashlib.md5(hash_input.encode()).hexdigest()[:8]

        return {
            'hash': audio_hash,
            'sampleRate': 48000,
            'channelCount': 2,
            'channelCountMode': 'max',
            'channelInterpretation': 'speakers',
            'latency': 0.01,
            'baseLatency': 0.005,
            'outputLatency': 0.005
        }

    def decode_hardware(self, tensor: torch.Tensor, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decode hardware component from tensor

        Args:
            tensor: Hardware tensor of shape (batch_size, 256)
            params: Original parameters for consistency

        Returns:
            Dictionary with hardware fingerprint data
        """
        data = tensor.cpu().detach().numpy()[0]

        os_name = params.get('os', 'Windows')
        browser_version = params.get('browserVersion', '120')

        # Select hardware concurrency based on tensor
        cores_options = [4, 6, 8, 12, 16]
        cores_index = int(abs(data[0]) * 10) % len(cores_options)
        cores = cores_options[cores_index]

        # Select device memory based on tensor
        memory_options = [4, 8, 16, 32]
        memory_index = int(abs(data[1]) * 10) % len(memory_options)
        memory = memory_options[memory_index]

        # Build platform string based on OS
        if 'windows' in os_name.lower():
            platform = 'Win32'
        elif 'mac' in os_name.lower():
            platform = 'MacIntel'
        else:
            platform = 'Linux x86_64'

        # Build user agent
        if 'windows' in os_name.lower():
            os_version = 'Windows NT 10.0; Win64; x64'
        elif 'mac' in os_name.lower():
            os_version = 'Macintosh; Intel Mac OS X 10_15_7'
        else:
            os_version = 'X11; Linux x86_64'

        user_agent = f'Mozilla/5.0 ({os_version}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{browser_version}.0.0.0 Safari/537.36'

        return {
            'platform': platform,
            'hardwareConcurrency': cores,
            'deviceMemory': memory,
            'maxTouchPoints': 0,
            'userAgent': user_agent,
            'language': 'en-US',
            'languages': ['en-US', 'en'],
            'timezone': 'America/New_York',
            'timezoneOffset': 240
        }

    def decode_screen(self, tensor: torch.Tensor) -> Dict[str, Any]:
        """
        Decode screen component from tensor

        Args:
            tensor: Screen tensor of shape (batch_size, 128)

        Returns:
            Dictionary with screen fingerprint data
        """
        data = tensor.cpu().detach().numpy()[0]

        # Select resolution based on tensor
        resolutions = [
            (1920, 1080),
            (1366, 768),
            (1440, 900),
            (1536, 864),
            (2560, 1440),
            (3840, 2160)
        ]
        res_index = int(abs(data[0]) * 10) % len(resolutions)
        width, height = resolutions[res_index]

        # Select color depth
        color_depths = [24, 30, 32]
        depth_index = int(abs(data[1]) * 10) % len(color_depths)
        color_depth = color_depths[depth_index]

        # Select DPR
        dprs = [1, 1.25, 1.5, 2]
        dpr_index = int(abs(data[2]) * 10) % len(dprs)
        dpr = dprs[dpr_index]

        return {
            'width': width,
            'height': height,
            'availWidth': width,
            'availHeight': height - 40,  # Account for taskbar
            'colorDepth': color_depth,
            'pixelDepth': color_depth,
            'orientation': {
                'angle': 0,
                'type': 'landscape-primary'
            },
            'devicePixelRatio': dpr,
            'touchSupport': {
                'maxTouchPoints': 0,
                'touchEvent': False,
                'touchStart': False
            }
        }

    def decode_fingerprint(self, components: Dict[str, torch.Tensor], params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert tensor components to full fingerprint profile

        Args:
            components: Dictionary with tensor components
            params: Original parameters for consistency

        Returns:
            Full fingerprint profile dictionary
        """
        return {
            'canvas': self.decode_canvas(components['canvas']),
            'webgl': self.decode_webgl(components['webgl'], params),
            'audio': self.decode_audio(components['audio']),
            'hardware': self.decode_hardware(components['hardware'], params),
            'screen': self.decode_screen(components['screen'])
        }

    def generate(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        High-level method to generate a complete fingerprint profile

        Args:
            params: Dictionary with generation parameters
                - country: Country code (e.g., 'US')
                - os: Operating system ('Windows', 'Mac', 'Linux')
                - browser: Browser name ('Chrome', 'Firefox', etc.)
                - browserVersion: Browser version (e.g., '120')

        Returns:
            Complete fingerprint profile
        """
        self.eval()
        with torch.no_grad():
            # Generate components
            components = self.forward(params)

            # Decode to fingerprint
            fingerprint = self.decode_fingerprint(components, params)

        return fingerprint


# Utility functions for training

def consistency_loss(generated: Dict[str, torch.Tensor]) -> torch.Tensor:
    """
    Calculate consistency loss to ensure generated components are consistent

    Args:
        generated: Dictionary with generated component tensors

    Returns:
        Consistency loss value
    """
    # Simple L2 regularization to prevent extreme values
    loss = torch.tensor(0.0, requires_grad=True)

    for component_name, tensor in generated.items():
        # Penalize extreme values
        loss = loss + torch.mean(torch.abs(tensor))

    return loss / len(generated)


def realism_loss(generated: Dict[str, torch.Tensor], real: Dict[str, torch.Tensor]) -> torch.Tensor:
    """
    Calculate realism loss by comparing generated to real fingerprints

    Args:
        generated: Dictionary with generated component tensors
        real: Dictionary with real component tensors

    Returns:
        Realism loss value
    """
    loss = torch.tensor(0.0, requires_grad=True)

    for component_name in generated.keys():
        if component_name in real:
            # MSE loss between generated and real
            loss = loss + F.mse_loss(generated[component_name], real[component_name])

    return loss / len(generated)


if __name__ == '__main__':
    # Test the model
    print("Testing FingerprintGenerator model...")

    model = FingerprintGenerator(use_pretrained=True)

    # Test parameters
    test_params = {
        'country': 'US',
        'os': 'Windows',
        'browser': 'Chrome',
        'browserVersion': '120'
    }

    # Generate fingerprint
    print("\nGenerating fingerprint with parameters:", test_params)
    fingerprint = model.generate(test_params)

    print("\nGenerated fingerprint:")
    print(json.dumps(fingerprint, indent=2))

    print("\n✅ Model test successful!")
