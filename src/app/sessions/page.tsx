
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Session, Client, BehaviouralBrief, BehaviourQuestionnaire } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { format, parseISO, isValid, parse } from 'date-fns';
import { Edit, Trash2, Clock, CalendarDays as CalendarIconLucide, DollarSign, MoreHorizontal, Loader2, Info, Tag as TagIcon, ChevronLeft, Plus, Save, FileText, FileQuestion, X, CalendarPlus } from 'lucide-react';
import Image from 'next/image';
