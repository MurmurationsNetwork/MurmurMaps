import { EdKeypair } from '@ucans/ucans';

async function generateKey() {
	const keypair = await EdKeypair.create({
		exportable: true
	});
	const exported = await keypair.export();

	console.log('✅ Generated server keys successfully!');
	console.log('');
	console.log('Please add the following to your .env file:');
	console.log('');
	console.log(`PUBLIC_SERVER_DID_KEY=${keypair.did()}`);
	console.log(`PRIVATE_SERVER_KEY=${exported}`);
	console.log('');
}

generateKey().catch(console.error);
