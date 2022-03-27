import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'

const useSearch = () => {
  const [searchText, setSearchText] = useState<string>('')

  const history = useHistory()

  const onChangeSearchText = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value)
  }

  const onSubmitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (searchText) {
      history.push({
        pathname: '/discover',
        search: '?' + new URLSearchParams({ searchText }).toString(),
      })
    } else {
      history.push({
        pathname: '/discover',
        search: '?' + new URLSearchParams({}).toString(),
      })
    }
  }
  return { onChangeSearchText, searchText, onSubmitSearch }
}

export default useSearch
