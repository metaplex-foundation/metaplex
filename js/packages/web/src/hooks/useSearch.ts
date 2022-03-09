import React, { useState } from 'react'

const useSearch = () => {
  const [searchText, setSearchText] = useState<string>('')
  const onChangeSearchText = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value)
  }
  const onSubmitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    alert('searchText')
  }
  return { onChangeSearchText, searchText, onSubmitSearch }
}

export default useSearch
