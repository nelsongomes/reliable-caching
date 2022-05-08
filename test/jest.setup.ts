process.env.FORCE_COLOR = '0';
process.env.SERVICE_NAME = 'my-service';

beforeEach(() => {
	jest.resetModules();
	jest.resetAllMocks();
});
