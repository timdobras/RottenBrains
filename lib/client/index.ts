'use client';
import { useEffect, useState } from 'react';
import { ExploreTabProps, MediaPageProps } from '@/types';
import { fetchExploreData } from './fetchExploreData';
import { fetchMediaData } from './fetchMediaData';

export function getExploreData({ action }: ExploreTabProps) {
  const [data, setData] = useState<any>();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      try {
        const result = await fetchExploreData(action);
        setData(result);
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, [action]); // Add action as a dependency

  return { data, loading };
}

export function getMediaData({ media_type, media_id }: MediaPageProps) {
  const [data, setData] = useState<any>();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      try {
        const result = await fetchMediaData(media_type, media_id);
        setData(result);
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, [media_type, media_id]); // Add media_type and id as dependencies

  return { data, loading };
}
