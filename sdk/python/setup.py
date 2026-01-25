"""
UndetectBrowser Python SDK
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="antidetect-sdk",
    version="1.0.0",
    author="UndetectBrowser Team",
    author_email="support@undetectbrowser.io",
    description="Official Python SDK for UndetectBrowser Anti-Detection Platform",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/wpeva/new-undetect-browser",
    project_urls={
        "Bug Tracker": "https://github.com/wpeva/new-undetect-browser/issues",
        "Documentation": "https://github.com/wpeva/new-undetect-browser#readme",
    },
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Internet :: WWW/HTTP :: Browsers",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.28.0",
        "websocket-client>=1.5.0",
        "pydantic>=2.0.0",
    ],
    extras_require={
        "async": ["aiohttp>=3.8.0", "websockets>=11.0"],
        "dev": ["pytest>=7.0.0", "pytest-asyncio>=0.21.0", "black", "mypy"],
    },
)
