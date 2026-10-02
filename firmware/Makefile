CC ?= clang
CFLAGS ?= -Wall -Wextra -Werror -O2 -fPIC -Iinclude
SRC = src/dual_h3lis331.c src/melty_heading.c src/melty_drive.c src/melty_failsafe.c src/melty_telemetry.c src/melty_core.c
OBJ = $(SRC:.c=.o)
TARGET_LIB = libmelty.dylib
STATIC_LIB = libmelty.a

.PHONY: all clean

all: $(TARGET_LIB) $(STATIC_LIB)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

$(TARGET_LIB): $(OBJ)
	$(CC) -dynamiclib -o $@ $(OBJ)

$(STATIC_LIB): $(OBJ)
	ar rcs $@ $(OBJ)

clean:
	rm -f src/*.o *.o $(TARGET_LIB) $(STATIC_LIB)
