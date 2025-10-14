  // Mock data for visualization when no predictions exist
  const mockGranularAverages = {
    gender_bias: 0.38,
    caste_bias: 0.52,
    religious_bias: 0.29,
    regional_bias: 0.64,
    socioeconomic_bias: 0.71,
    judicial_attitude_bias: 0.41,
    language_bias: 0.47
  };
  
  // Memoize displayAverages to prevent unnecessary re-renders
  const displayAverages = useMemo(() => {
    if (granularAverages && Object.keys(granularAverages).length > 0) {
      return granularAverages;
    }
    return mockGranularAverages;
  }, [granularAverages]);
  
  const getBiasColor = (score: number) => {
