# Makefile for eBPF programs

# Compiler and flags
CLANG := clang
LLC := llc
BPFTOOL := bpftool

CLANG_FLAGS := -O2 -target bpf -g -Wall -Werror
INCLUDES := -I/usr/include -I/usr/include/bpf -I/usr/include/linux

# Source and object files
TCP_SRC := tcp_fingerprint.c
TCP_OBJ := tcp_fingerprint.o

JA3_SRC := tls_ja3.c
JA3_OBJ := tls_ja3.o

# Targets
.PHONY: all clean install check

all: $(TCP_OBJ) $(JA3_OBJ)

# Compile TCP fingerprint
$(TCP_OBJ): $(TCP_SRC)
	@echo "Compiling $(TCP_SRC)..."
	$(CLANG) $(CLANG_FLAGS) $(INCLUDES) -c $< -o $@
	@echo "✓ $(TCP_OBJ) created"

# Compile JA3 TLS
$(JA3_OBJ): $(JA3_SRC)
	@echo "Compiling $(JA3_SRC)..."
	$(CLANG) $(CLANG_FLAGS) $(INCLUDES) -c $< -o $@
	@echo "✓ $(JA3_OBJ) created"

# Check compiled objects
check: $(TCP_OBJ) $(JA3_OBJ)
	@echo "Checking compiled objects..."
	@file $(TCP_OBJ)
	@file $(JA3_OBJ)
	@echo "✓ All objects valid"

# Install to BPF filesystem (requires root)
install: $(TCP_OBJ) $(JA3_OBJ)
	@echo "Installing eBPF programs..."
	@if [ ! -d /sys/fs/bpf ]; then \
		echo "Error: BPF filesystem not mounted"; \
		echo "Run: sudo mount -t bpf bpffs /sys/fs/bpf"; \
		exit 1; \
	fi
	@echo "✓ BPF filesystem ready"

# Clean
clean:
	@echo "Cleaning..."
	rm -f $(TCP_OBJ) $(JA3_OBJ)
	@echo "✓ Clean complete"

# Help
help:
	@echo "eBPF Network Fingerprinting Makefile"
	@echo ""
	@echo "Targets:"
	@echo "  all      - Compile all eBPF programs"
	@echo "  check    - Verify compiled objects"
	@echo "  install  - Install to BPF filesystem (requires root)"
	@echo "  clean    - Remove compiled objects"
	@echo "  help     - Show this help"
	@echo ""
	@echo "Requirements:"
	@echo "  - clang (apt-get install clang)"
	@echo "  - libbpf (apt-get install libbpf-dev)"
	@echo "  - linux-headers (apt-get install linux-headers-$(uname -r))"
	@echo ""
	@echo "Usage:"
	@echo "  make          # Compile all"
	@echo "  make check    # Verify"
	@echo "  sudo make install  # Install"
