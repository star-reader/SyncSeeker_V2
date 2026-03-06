#include "bindings/bindings.h"

extern "C" int syncseeker_ios_bootstrap_background_refresh();

int main(int argc, char * argv[]) {
	syncseeker_ios_bootstrap_background_refresh();
	ffi::start_app();
	return 0;
}
