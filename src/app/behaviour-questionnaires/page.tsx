"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ClipboardList, User, Calendar, Dog } from 'lucide-react';
import { BehaviourQuestionnaire } from '@/lib/types';
import { getBehaviourQuestionnaires } from '@/lib/supabaseService';
import { format } from 'date-fns';

export default function BehaviourQuestionnairesPage() {
  const [questionnaires, setQuestionnaires] = useState<BehaviourQuestionnaire[]>([]);
  const [filteredQuestionnaires, setFilteredQuestionnaires] = useState<BehaviourQuestionnaire[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<BehaviourQuestionnaire | null>(null);

  useEffect(() => {
    loadQuestionnaires();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = questionnaires.filter(q =>
        q.dogName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.dogBreed.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.mainProblem.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredQuestionnaires(filtered);
    } else {
      setFilteredQuestionnaires(questionnaires);
    }
  }, [searchTerm, questionnaires]);

  const loadQuestionnaires = async () => {
    try {
      setIsLoading(true);
      const data = await getBehaviourQuestionnaires();
      setQuestionnaires(data);
      setFilteredQuestionnaires(data);
    } catch (error) {
      console.error('Error loading behaviour questionnaires:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  if (selectedQuestionnaire) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => setSelectedQuestionnaire(null)}
            className="flex items-center gap-2"
          >
            ← Back to List
          </Button>
          <h1 className="text-2xl font-bold">Behaviour Questionnaire Details</h1>
        </div>

        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {selectedQuestionnaire.dogName} - Behaviour Questionnaire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Dog Name</label>
                <p className="text-lg">{selectedQuestionnaire.dogName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Dog Age</label>
                <p className="text-lg">{selectedQuestionnaire.dogAge}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Dog Sex</label>
                <p className="text-lg">{selectedQuestionnaire.dogSex}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Dog Breed</label>
                <p className="text-lg">{selectedQuestionnaire.dogBreed}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Submission Date</label>
                <p className="text-lg">{formatDate(selectedQuestionnaire.submissionDate)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Neutered/Spayed</label>
                <p className="text-lg">{selectedQuestionnaire.neuteredSpayedDetails}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Main Problem</label>
              <p className="mt-2 p-4 bg-gray-50 rounded-lg">{selectedQuestionnaire.mainProblem}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Ideal Training Outcome</label>
              <p className="mt-2 p-4 bg-gray-50 rounded-lg">{selectedQuestionnaire.idealTrainingOutcome}</p>
            </div>

            {selectedQuestionnaire.dogLikes && (
              <div>
                <label className="text-sm font-medium text-gray-600">What the Dog Likes</label>
                <p className="mt-2 p-4 bg-gray-50 rounded-lg">{selectedQuestionnaire.dogLikes}</p>
              </div>
            )}

            {selectedQuestionnaire.dogChallenges && (
              <div>
                <label className="text-sm font-medium text-gray-600">Dog Challenges</label>
                <p className="mt-2 p-4 bg-gray-50 rounded-lg">{selectedQuestionnaire.dogChallenges}</p>
              </div>
            )}

            {selectedQuestionnaire.sociabilityWithDogs && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Sociability with Dogs</label>
                  <p className="text-lg">{selectedQuestionnaire.sociabilityWithDogs}</p>
                </div>
                {selectedQuestionnaire.sociabilityWithPeople && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Sociability with People</label>
                    <p className="text-lg">{selectedQuestionnaire.sociabilityWithPeople}</p>
                  </div>
                )}
              </div>
            )}

            {selectedQuestionnaire.additionalInformation && (
              <div>
                <label className="text-sm font-medium text-gray-600">Additional Information</label>
                <p className="mt-2 p-4 bg-gray-50 rounded-lg">{selectedQuestionnaire.additionalInformation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          Behaviour Questionnaires
        </h1>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by dog name, breed, or main problem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading behaviour questionnaires...</div>
      ) : filteredQuestionnaires.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No behaviour questionnaires found matching your search.' : 'No behaviour questionnaires found.'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredQuestionnaires.map((questionnaire) => (
            <Card key={questionnaire.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedQuestionnaire(questionnaire)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Dog className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{questionnaire.dogName}</span>
                    </div>
                    <span className="text-sm text-gray-500">{questionnaire.dogBreed}</span>
                    <span className="text-sm text-gray-500">({questionnaire.dogSex})</span>
                    <span className="text-sm text-gray-500">Age: {questionnaire.dogAge}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    {formatDate(questionnaire.submissionDate)}
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  <strong>Main Problem:</strong> {questionnaire.mainProblem}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
