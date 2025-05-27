
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { addClient } from '@/lib/dataService';
import type { Client } from '@/lib/types';

// Define the expected schema for the incoming client data
const ImportClientSchema = z.object({
  name: z.string().min(2, { message: "Client name must be at least 2 characters." }),
  dogName: z.string().min(1, { message: "Dog name is required." }),
  dogBreed: z.string().min(2, { message: "Dog breed must be at least 2 characters." }),
  contactEmail: z.string().email({ message: "Invalid email address." }),
  contactPhone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  behaviorHistory: z.string().optional(),
  // Add any other fields that come directly from your Squarespace form / Google Sheet
});

export async function POST(request: NextRequest) {
  // SECURITY_NOTE: In a production environment, you should secure this endpoint.
  // Options include:
  // 1. A secret key/token passed in the headers or query parameters.
  // 2. IP whitelisting (if Google Apps Script has static IPs, which is unlikely for UrlFetchApp).
  // 3. App security check if the request is made from a trusted environment.
  // For now, this endpoint is open.
  // Example secret key check:
  // const secret = request.headers.get('X-Squarespace-Secret');
  // if (secret !== process.env.SQUARESPACE_WEBHOOK_SECRET) {
  //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  // }

  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = ImportClientSchema.safeParse(requestBody);

  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid input data', details: validationResult.error.flatten() },
      { status: 400 }
    );
  }

  const clientDataFromForm: Omit<Client, 'id' | 'lastSession' | 'nextSession' | 'createdAt' | 'ownerFirstName' | 'ownerLastName' | 'contactNumber' | 'postcode' | 'submissionDate'> & { name: string, dogName: string, dogBreed: string, contactEmail: string, contactPhone: string, behaviorHistory?: string } = {
    name: validationResult.data.name, // This 'name' will need to be split or handled for ownerFirstName/LastName
    dogName: validationResult.data.dogName,
    dogBreed: validationResult.data.dogBreed, // This assumes dogBreed is a simple string
    contactEmail: validationResult.data.contactEmail,
    contactPhone: validationResult.data.contactPhone, // This assumes contactPhone maps to client.contactNumber
    behaviorHistory: validationResult.data.behaviorHistory || '',
  };

  // Adapt clientDataFromForm to the structure expected by addClientToFirestore
  // This is a simplified adaptation; you might need more sophisticated logic
  // to split 'name' into 'ownerFirstName' and 'ownerLastName'.
  const clientDataForFirestore = {
    ownerFirstName: clientDataFromForm.name.split(' ')[0] || clientDataFromForm.name, // Simple split
    ownerLastName: clientDataFromForm.name.split(' ').slice(1).join(' ') || '', // Simple split
    contactEmail: clientDataFromForm.contactEmail,
    contactNumber: clientDataFromForm.contactPhone,
    postcode: '', // Postcode is not in ImportClientSchema, add if needed or handle default
    dogName: clientDataFromForm.dogName,
    // dogBreed: clientDataFromForm.dogBreed, // Not directly on Client type, part of BehaviouralBrief/Questionnaire
    // behaviorHistory: clientDataFromForm.behaviorHistory, // Not directly on Client type
    // isMember: false, // Default value
    // submissionDate will be set by addClientToFirestore
  };


  try {
    const newClient = await addClient(clientDataForFirestore);
    return NextResponse.json({ success: true, clientId: newClient.id, message: 'Client imported successfully' });
  } catch (error) {
    console.error('Error importing client:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to import client';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
// Example Google Apps Script (simplified):
    /*
    function onFormSubmit(e) {
      // Assuming 'e.namedValues' contains the form data as an object
      // where keys are column headers. You might need to adjust how you get row data.
      // Example: e.namedValues['Client Name'][0], e.namedValues['Dog Name'][0]

      var clientData = {
        name: e.namedValues['Client Name'] ? e.namedValues['Client Name'][0] : '',
        dogName: e.namedValues['Dog Name'] ? e.namedValues['Dog Name'][0] : '',
        dogBreed: e.namedValues['Dog Breed'] ? e.namedValues['Dog Breed'][0] : '',
        contactEmail: e.namedValues['Email'] ? e.namedValues['Email'][0] : '',
        contactPhone: e.namedValues['Phone'] ? e.namedValues['Phone'][0] : '',
        behaviorHistory: e.namedValues['Behavior History'] ? e.namedValues['Behavior History'][0] : ''
      };

      var options = {
        'method' : 'post',
        'contentType': 'application/json',
        // 'headers': { 'X-Squarespace-Secret': 'YOUR_SECRET_KEY_IF_IMPLEMENTED' },
        'payload' : JSON.stringify(clientData)
      };

      // Replace with your actual API endpoint URL
      // When you deploy your Next.js app, this URL will change to your production URL (e.g., `https://your-raisingmyrescue-app.com/api/import-client`).
      var apiUrl = 'YOUR_NEXTJS_APP_URL/api/import-client';
      // For local testing: var apiUrl = 'http://localhost:9002/api/import-client';


      try {
        var response = UrlFetchApp.fetch(apiUrl, options);
        Logger.log(response.getContentText());
      } catch (error) {
        Logger.log('Error sending data: ' + error.toString());
      }
    }
    */
