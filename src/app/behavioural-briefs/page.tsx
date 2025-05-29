"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FileText, User, Calendar, Dog } from 'lucide-react';
import { BehaviouralBrief } from '@/lib/types';
import { getBehaviouralBriefs } from '@/lib/supabaseService';
import { format } from 'date-fns';

export default function BehaviouralBriefsPage() {
  const [briefs, setBriefs] = useState<BehaviouralBrief[]>([]);
  const [filteredBriefs, setFilteredBriefs] = useState<BehaviouralBrief[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBrief, setSelectedBrief] = useState<BehaviouralBrief | null>(null);

  useEffect(() => {
    loadBriefs();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = briefs.filter(brief =>
        brief.dogName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brief.dogBreed.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brief.lifeWithDogAndHelpNeeded.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBriefs(filtered);
    } else {
      setFilteredBriefs(briefs);
    }
  }, [searchTerm, briefs]);

  const loadBriefs = async () => {
    try {
      setIsLoading(true);
      const data = await getBehaviouralBriefs();
      setBriefs(data);
      setFilteredBriefs(data);
    } catch (error) {
      console.error('Error loading behavioural briefs:', error);
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

  if (selectedBrief) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => setSelectedBrief(null)}
            className="flex items-center gap-2"
          >
            ← Back to List
          </Button>
          <h1 className="text-2xl font-bold">Behavioural Brief Details</h1>
        </div>

        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedBrief.dogName} - Behavioural Brief
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Dog Name</label>
                <p className="text-lg">{selectedBrief.dogName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Dog Sex</label>
                <p className="text-lg">{selectedBrief.dogSex}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Dog Breed</label>
                <p className="text-lg">{selectedBrief.dogBreed}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Submission Date</label>
                <p className="text-lg">{formatDate(selectedBrief.submissionDate)}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Life with Dog & Help Needed</label>
              <p className="mt-2 p-4 bg-gray-50 rounded-lg">{selectedBrief.lifeWithDogAndHelpNeeded}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Best Outcome</label>
              <p className="mt-2 p-4 bg-gray-50 rounded-lg">{selectedBrief.bestOutcome}</p>
            </div>

            {selectedBrief.idealSessionTypes && selectedBrief.idealSessionTypes.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">Ideal Session Types</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedBrief.idealSessionTypes.map((type, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {type}
                    </span>
                  ))}
                </div>
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
          <FileText className="h-6 w-6" />
          Behavioural Briefs
        </h1>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by dog name, breed, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading behavioural briefs...</div>
      ) : filteredBriefs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No behavioural briefs found matching your search.' : 'No behavioural briefs found.'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBriefs.map((brief) => (
            <Card key={brief.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedBrief(brief)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Dog className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{brief.dogName}</span>
                    </div>
                    <span className="text-sm text-gray-500">{brief.dogBreed}</span>
                    <span className="text-sm text-gray-500">({brief.dogSex})</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    {formatDate(brief.submissionDate)}
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {brief.lifeWithDogAndHelpNeeded}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
